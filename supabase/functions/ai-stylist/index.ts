
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const currencies = ['DZD', 'USD', 'EUR', 'GBP'];
const universes = ['CALM', 'CHAOS'];

function parseModelJson(content: string): Record<string, unknown> {
  try {
    return JSON.parse(content);
  } catch {
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    if (start < 0 || end <= start) throw new Error('Invalid AI response');
    return JSON.parse(content.slice(start, end + 1));
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: 'Server configuration error' }, 500);
  }

  // Authenticate the actual user before using privileged database access.
  const authorization = req.headers.get('Authorization');
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!token) {
    return json({ error: 'Authentication required' }, 401);
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } =
    await authClient.auth.getUser(token);

  if (authError || !authData.user) {
    return json({ error: 'Invalid or expired session' }, 401);
  }

  const userId = authData.user.id;

  let body: Record<string, unknown>;

  try {
    const parsed = await req.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return json({ error: 'Invalid request body' }, 400);
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const occasion = body.occasion;
  const budget = body.budget;
  const currency = body.currency;
  const requestedUniverses = body.universes ?? [];
  const palette = body.palette ?? [];
  const note = body.note ?? '';

  if (
    typeof occasion !== 'string' ||
    occasion.trim().length < 1 ||
    occasion.length > 80
  ) {
    return json({ error: 'Invalid occasion' }, 400);
  }

  if (
    typeof budget !== 'number' ||
    !Number.isFinite(budget) ||
    budget <= 0 ||
    budget > 1_000_000_000
  ) {
    return json({ error: 'Invalid budget' }, 400);
  }

  if (typeof currency !== 'string' || !currencies.includes(currency)) {
    return json({ error: 'Unsupported currency' }, 400);
  }

  if (
    !Array.isArray(requestedUniverses) ||
    requestedUniverses.length > 2 ||
    !requestedUniverses.every(
      (value) => typeof value === 'string' && universes.includes(value),
    )
  ) {
    return json({ error: 'Invalid style selection' }, 400);
  }

  if (
    !Array.isArray(palette) ||
    palette.length > 12 ||
    !palette.every(
      (value) => typeof value === 'string' && value.length <= 40,
    )
  ) {
    return json({ error: 'Invalid palette' }, 400);
  }

  if (typeof note !== 'string' || note.length > 1000) {
    return json({ error: 'Invalid note' }, 400);
  }

  // Image analysis is not implemented by this function yet.
  if (
    body.image_uris !== undefined &&
    (!Array.isArray(body.image_uris) || body.image_uris.length > 0)
  ) {
    return json(
      { error: 'Image styling is not supported by this endpoint yet' },
      400,
    );
  }

  const provider = Deno.env.get('AI_PROVIDER') ?? 'openai';

  if (!['openai', 'anthropic'].includes(provider)) {
    return json({ error: 'Unsupported AI provider' }, 500);
  }

  const apiKey = Deno.env.get('AI_API_KEY');
  const model =
    Deno.env.get('AI_MODEL') ??
    (provider === 'anthropic' ? 'claude-sonnet-4-5' : 'gpt-4o-mini');

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const started = Date.now();

  async function logUsage(status: 'ok' | 'error' | 'fallback') {
    const { error } = await supabase.from('ai_usage').insert({
      user_id: userId,
      model,
      provider,
      latency_ms: Date.now() - started,
      status,
    });

    if (error) {
      console.error('AI usage logging failed');
    }
  }

  if (!apiKey) {
    await logUsage('fallback');
    return json({ configured: false, result: null });
  }

  try {
    let query = supabase
      .from('products')
      .select(
        'id,title,brand,category,universe,price,currency,in_stock',
      )
      .eq('in_stock', true)
      .eq('currency', currency)
      .limit(60);

    if (requestedUniverses.length > 0) {
      query = query.in('universe', requestedUniverses);
    }

    const { data: products, error: productError } = await query;

    if (productError) {
      throw new Error('Product catalogue unavailable');
    }

    const catalogue = products ?? [];

    const system =
      'You are ATHR, a fashion stylist. Choose only product IDs from the ' +
      'provided catalogue. Return strict JSON with keys product_ids, ' +
      'reasoning and message. Recommend at most 6 products. The server ' +
      'will independently enforce the budget and verify every product. ' +
      'Never invent products, prices, stock, or links.';

    const userPrompt = JSON.stringify({
      request: { occasion, budget, currency, universes: requestedUniverses, palette, note },
      products: catalogue.map((p) => ({
        id: p.id,
        title: p.title,
        brand: p.brand,
        category: p.category,
        universe: p.universe,
        price: p.price,
        currency: p.currency,
      })),
    });

    let content = '';

    if (provider === 'anthropic') {
      const response = await fetch(
        'https://api.anthropic.com/v1/messages',
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model,
            max_tokens: 800,
            system,
            messages: [{ role: 'user', content: userPrompt }],
          }),
        },
      );

      if (!response.ok) throw new Error('AI provider request failed');

      const data = await response.json();
      content = (data.content ?? [])
        .map((part: { text?: string }) => part.text ?? '')
        .join('');
    } else {
      const response = await fetch(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: userPrompt },
            ],
          }),
        },
      );

      if (!response.ok) throw new Error('AI provider request failed');

      const data = await response.json();
      content = data.choices?.[0]?.message?.content ?? '';
    }

    const resultFromAI = parseModelJson(content);
    const proposedIds = Array.isArray(resultFromAI.product_ids)
      ? resultFromAI.product_ids
      : [];

    // Trust database prices, not the model's claims.
    // Skip any item that would take the total over the user's budget.
    const chosenProducts: typeof catalogue = [];
    const seen = new Set<string>();
    let total = 0;

    for (const proposedId of proposedIds) {
      if (typeof proposedId !== 'string' || seen.has(proposedId)) continue;
      seen.add(proposedId);

      const product = catalogue.find((item) => item.id === proposedId);
      if (!product) continue;

      const price = Number(product.price);
      if (!Number.isFinite(price) || price < 0) continue;
      if (total + price > budget) continue;

      chosenProducts.push(product);
      total += price;

      if (chosenProducts.length >= 6) break;
    }

    const chosenIds = chosenProducts.map((product) => product.id);

    const reasoning = Array.isArray(resultFromAI.reasoning)
      ? resultFromAI.reasoning.filter(
          (item): item is string =>
            typeof item === 'string' && item.length <= 300,
        ).slice(0, 6)
      : [];

    const message =
      typeof resultFromAI.message === 'string'
        ? resultFromAI.message.slice(0, 1000)
        : 'Here is your look.';

    const result = {
      messages: [
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: message,
          product_ids: chosenIds,
          reasoning,
          created_at: new Date().toISOString(),
        },
      ],
      product_ids: chosenIds,
      reasoning,
      engine: 'cloud-ai',
      model,
      total_cost: total,
      currency,
    };

    await logUsage('ok');
    return json({ configured: true, result });
  } catch {
    await logUsage('error');
    return json(
      { configured: true, result: null, error: 'AI styling request failed' },
      502,
    );
  }
});
