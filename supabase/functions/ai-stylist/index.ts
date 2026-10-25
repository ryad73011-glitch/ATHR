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

// Use OpenRouter's free-model router only.
// Do not fall back to a paid model automatically.
const PROVIDER = 'openrouter';
const MODEL = 'openrouter/free';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = 30_000,
): Promise<Response> {
  // Keep the abort signal active while the response body is being consumed too.
  return fetch(url, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
  });
}

function parseModelJson(content: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(content);

    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed)
    ) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Some models wrap JSON in Markdown. Try extracting the JSON object.
  }

  const start = content.indexOf('{');
  const end = content.lastIndexOf('}');

  if (start < 0 || end <= start) {
    throw new Error('Invalid AI response');
  }

  const parsed: unknown = JSON.parse(content.slice(start, end + 1));

  if (
    parsed === null ||
    typeof parsed !== 'object' ||
    Array.isArray(parsed)
  ) {
    throw new Error('Invalid AI response');
  }

  return parsed as Record<string, unknown>;
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
  const apiKey = Deno.env.get('OPENROUTER_API_KEY');

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error('Supabase server configuration is incomplete');
    return json({ error: 'Server configuration error' }, 500);
  }

  // Authenticate the actual user before using privileged database access.
  const authorization = req.headers.get('Authorization');
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!token) {
    return json({ error: 'Authentication required' }, 401);
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: authData, error: authError } =
    await authClient.auth.getUser(token);

  if (authError || !authData.user) {
    return json({ error: 'Invalid or expired session' }, 401);
  }

  const userId = authData.user.id;

  let body: Record<string, unknown>;

  try {
    const parsed: unknown = await req.json();

    if (
      parsed === null ||
      typeof parsed !== 'object' ||
      Array.isArray(parsed)
    ) {
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

  if (
    typeof currency !== 'string' ||
    !currencies.includes(currency)
  ) {
    return json({ error: 'Unsupported currency' }, 400);
  }

  if (
    !Array.isArray(requestedUniverses) ||
    requestedUniverses.length > 2 ||
    !requestedUniverses.every(
      (value) =>
        typeof value === 'string' &&
        universes.includes(value),
    )
  ) {
    return json({ error: 'Invalid style selection' }, 400);
  }

  if (
    !Array.isArray(palette) ||
    palette.length > 12 ||
    !palette.every(
      (value) =>
        typeof value === 'string' &&
        value.length <= 40,
    )
  ) {
    return json({ error: 'Invalid palette' }, 400);
  }

  if (typeof note !== 'string' || note.length > 1000) {
    return json({ error: 'Invalid note' }, 400);
  }

  // Image analysis is not implemented in this endpoint yet.
  // Do not pretend that a phone-local image URI is accessible to the server.
  if (
    body.image_uris !== undefined &&
    (
      !Array.isArray(body.image_uris) ||
      body.image_uris.length > 0
    )
  ) {
    return json(
      {
        error:
          'Image styling is not supported by this endpoint yet',
      },
      400,
    );
  }

  const supabase = createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  const { data: usageId, error: reservationError } = await supabase.rpc(
    'reserve_ai_usage',
    { p_user_id: userId, p_feature: 'ai-stylist' },
  );

  if (reservationError) {
    console.error('AI usage reservation failed');
    return json({ error: 'AI usage controls are unavailable' }, 503);
  }

  if (typeof usageId !== 'string' || usageId.length === 0) {
    return json(
      { error: 'AI usage limit reached. Please try again later.' },
      429,
    );
  }

  const started = Date.now();
  let promptTokens = 0;
  let completionTokens = 0;
  let providerCostUsd: number | null = null;

  async function logUsage(
    status: 'ok' | 'error' | 'fallback',
  ) {
    const { error } = await supabase
      .from('ai_usage')
      .update({
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        provider_cost: providerCostUsd,
        latency_ms: Date.now() - started,
        status,
      })
      .eq('id', usageId)
      .eq('user_id', userId);

    if (error) {
      // Never log API keys, authorization headers, or user tokens.
      console.error('AI usage logging failed');
    }
  }

  if (!apiKey) {
    await logUsage('fallback');

    // The existing mobile client can use its local fallback.
    return json({
      configured: false,
      result: null,
    });
  }

  try {
    let query = supabase
      .from('products')
      .select(
        'id,title,brand,category,universe,price,currency,in_stock,colors,occasions',
      )
      .eq('in_stock', true)
      .eq('currency', currency)
      .limit(60);

    if (requestedUniverses.length > 0) {
      query = query.in('universe', requestedUniverses);
    }

    const { data: products, error: productError } =
      await query;

    if (productError) {
      throw new Error('Product catalogue unavailable');
    }

    const catalogue = products ?? [];

    
const system = [
  'You are ATHR personal fashion stylist. Your task is to create practical outfit suggestions from the supplied in-stock product catalogue.',
  'Focus on the requested occasion, budget, currency, CALM or CHAOS style universe, and preferred colour palette.',
  'Use only supplied catalogue data. Never invent products, brands, IDs, prices, stock status, availability, or purchase links.',
  'Choose at most 6 product IDs from the supplied catalogue. Prefer items that fit the requested universe, occasion, and palette.',
  'Keep the combined price of selected items within the requested budget. The server will verify product IDs and prices.',
  'If no products fit, return an empty product_ids array and still give useful general styling advice without pretending a product was selected.',
  'The message should explain the styling direction only. Do not list product names or prices in the message; the app displays server-verified product cards separately.',
  'Return exactly one valid JSON object with keys: product_ids, reasoning, message. Do not use Markdown or surrounding text.',
  'product_ids must be an array of catalogue IDs. reasoning must be an array of up to 6 short strings. message must be a concise, helpful styling explanation.',
  'When the user note clearly indicates Arabic, Algerian Darija, French, or English, reply in that language. Otherwise use concise English.',
  'Do not claim to analyse an image, body shape, or visual detail; this endpoint does not receive image content.',
  'State uncertainty where the catalogue does not provide enough information. Never fabricate facts.',
].join(' ');

    const userPrompt = JSON.stringify({
      request: {
        occasion: occasion.trim(),
        budget,
        currency,
        universes: requestedUniverses,
        palette,
        note: note.trim(),
      },
      products: catalogue.map((product) => ({
        id: product.id,
        title: product.title,
        brand: product.brand,
        category: product.category,
        universe: product.universe,
        price: product.price,
        currency: product.currency,
        colors: product.colors,
        occasions: product.occasions,
      })),
    });

    const response = await fetchWithTimeout(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer':
          'https://github.com/ryad73011-glitch/ATHR',
        'X-Title': 'ATHR WASM',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: system,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        temperature: 0.4,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      // Do not return raw provider errors to the client.
      // Never fall back to a paid provider or model.
      console.error(
        `OpenRouter request failed with status ${response.status}`,
      );

      throw new Error('OpenRouter request failed');
    }

    const data = await response.json();

    const usage = data?.usage;
    promptTokens =
      typeof usage?.prompt_tokens === 'number' &&
      Number.isFinite(usage.prompt_tokens) &&
      usage.prompt_tokens >= 0
        ? Math.floor(usage.prompt_tokens)
        : 0;
    completionTokens =
      typeof usage?.completion_tokens === 'number' &&
      Number.isFinite(usage.completion_tokens) &&
      usage.completion_tokens >= 0
        ? Math.floor(usage.completion_tokens)
        : 0;
    providerCostUsd =
      typeof usage?.cost === 'number' &&
      Number.isFinite(usage.cost) &&
      usage.cost >= 0
        ? usage.cost
        : null;

    const content = data.choices?.[0]?.message?.content;

    if (typeof content !== 'string' || content.length === 0) {
      throw new Error('OpenRouter returned an empty response');
    }

    const resultFromAI = parseModelJson(content);

    const proposedIds = Array.isArray(
      resultFromAI.product_ids,
    )
      ? resultFromAI.product_ids
      : [];

    // The database remains the source of truth for products and prices.
    const chosenProducts: typeof catalogue = [];
    const seen = new Set<string>();
    let total = 0;

    for (const proposedId of proposedIds) {
      if (
        typeof proposedId !== 'string' ||
        seen.has(proposedId)
      ) {
        continue;
      }

      seen.add(proposedId);

      const product = catalogue.find(
        (item) => item.id === proposedId,
      );

      if (!product) {
        continue;
      }

      const price = Number(product.price);

      if (!Number.isFinite(price) || price < 0) {
        continue;
      }

      if (total + price > budget) {
        continue;
      }

      chosenProducts.push(product);
      total += price;

      if (chosenProducts.length >= 6) {
        break;
      }
    }

    const chosenIds = chosenProducts.map(
      (product) => product.id,
    );

    const reasoning = Array.isArray(
      resultFromAI.reasoning,
    )
      ? resultFromAI.reasoning
          .filter(
            (item): item is string =>
              typeof item === 'string' &&
              item.length <= 300,
          )
          .slice(0, 6)
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
      model: MODEL,
      total_cost: total,
      currency,
    };

    await logUsage('ok');

    return json({
      configured: true,
      result,
    });
  } catch {
    await logUsage('error');

    return json(
      {
        configured: true,
        result: null,
        error: 'AI styling request failed',
      },
      502,
    );
  }
});
