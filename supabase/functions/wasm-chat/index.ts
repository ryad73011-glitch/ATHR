
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
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });

const MODEL = 'openrouter/free';
const OPENROUTER_URL =
  'https://openrouter.ai/api/v1/chat/completions';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

function parseResponse(content: string): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(content);
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  } catch {
    // Try extracting JSON if the model wrapped it in Markdown.
  }

  const start = content.indexOf('{');
  const end = content.lastIndexOf('}');

  if (start >= 0 && end > start) {
    const value: unknown = JSON.parse(content.slice(start, end + 1));
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  }

  throw new Error('Invalid model response');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');

  if (!url || !anonKey || !serviceKey) {
    return json({ error: 'Supabase server configuration is incomplete' }, 500);
  }

  if (!openRouterKey) {
    return json({ error: 'OPENROUTER_API_KEY is not configured' }, 503);
  }

  const token = req.headers
    .get('Authorization')
    ?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!token) {
    return json({ error: 'Authentication required' }, 401);
  }

  const authClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: auth, error: authError } =
    await authClient.auth.getUser(token);

  if (authError || !auth.user) {
    return json({ error: 'Invalid or expired session' }, 401);
  }

  let body: Record<string, unknown>;

  try {
    const value: unknown = await req.json();
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return json({ error: 'Invalid request body' }, 400);
    }
    body = value as Record<string, unknown>;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const message = body.message;
  const rawHistory = body.history ?? [];
  const universe = body.universe;
  const audience = body.audience ?? 'women';

  if (
    typeof message !== 'string' ||
    !message.trim() ||
    message.length > 2000
  ) {
    return json({ error: 'Message must contain 1–2000 characters' }, 400);
  }

  if (
    !Array.isArray(rawHistory) ||
    rawHistory.length > 40 ||
    !rawHistory.every(
      (item: unknown) =>
        !!item &&
        typeof item === 'object' &&
        !Array.isArray(item) &&
        ['user', 'assistant'].includes(
          (item as Record<string, unknown>).role as string,
        ) &&
        typeof (item as Record<string, unknown>).content === 'string' &&
        ((item as Record<string, unknown>).content as string).length <= 2000,
    )
  ) {
    return json({ error: 'Invalid conversation history' }, 400);
  }

  if (
    universe !== undefined &&
    universe !== 'CALM' &&
    universe !== 'CHAOS'
  ) {
    return json({ error: 'Invalid universe' }, 400);
  }

  if (audience !== 'women' && audience !== 'all') {
    return json({ error: 'Invalid audience' }, 400);
  }

  const history = (rawHistory as ChatMessage[]).slice(-12);

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: products, error: productError } = await supabase
      .from('products')
      .select('id,title,brand,category,universe,price,currency,in_stock')
      .eq('in_stock', true)
      .eq('currency', 'DZD')
      .limit(60);

    if (productError) {
      console.error('WASM catalogue query failed');
      return json({ error: 'Product catalogue is unavailable' }, 503);
    }

    const catalogue = products ?? [];

    const system = [
      'You are WASM, ATHR personal AI assistant.',
      'You are a general-purpose assistant, not only a fashion bot.',
      'Answer general questions directly and helpfully.',
      'Reply in the language used by the user. Support Algerian Darija, Arabic, French and English when possible.',
      'For fashion questions, give practical styling advice tailored to the user’s stated needs.',
      audience === 'women'
        ? 'The selected audience is women. Prioritize women’s personal styling, outfits, layering, modest options when requested, occasion dressing, color coordination, fit, comfort and budget. Never assume the user wears a particular style or covers their hair; ask or adapt when relevant.'
        : 'The selected audience is all styles. Adapt recommendations to the user’s stated gender presentation, preferences and needs without assumptions.',
      'Recommend ATHR products only when relevant and only from the supplied catalogue.',
      'The product catalogue does not provide a verified target-audience field. Do not claim a product is women-specific unless its supplied title/category clearly supports that; if uncertain, give styling advice without attaching a misleading product recommendation.',
      'Never invent product IDs, prices, stock status or availability.',
      'Never claim to have analysed a photo; this endpoint does not receive image content.',
      'Use the conversation history to understand follow-up messages.',
      'Return only one valid JSON object with keys: message, product_ids, reasoning.',
      'message must be a useful natural-language answer.',
      'product_ids must contain only IDs from the supplied catalogue, maximum 6; use an empty array when products are irrelevant.',
      'reasoning must be an array of short strings.',
      'Do not claim to have placed orders, contacted stores or performed actions you did not perform.',
    ].join(' ');

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openRouterKey}`,
        'HTTP-Referer': 'https://github.com/ryad73011-glitch/ATHR',
        'X-Title': 'ATHR WASM',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: system },
          {
            role: 'system',
            content:
              `Selected universe: ${universe ?? 'CALM'}. Selected audience: ${audience}. ` +
              `Available products (DZD, in stock): ${JSON.stringify(catalogue)}`,
          },
          ...history.map((item) => ({
            role: item.role,
            content: item.content,
          })),
          { role: 'user', content: message.trim() },
        ],
        temperature: 0.5,
        max_tokens: 1200,
      }),
    });

    if (!response.ok) {
      console.error(`OpenRouter returned HTTP ${response.status}`);
      return json({ error: 'OpenRouter request failed; no paid fallback was used' }, 502);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;

    if (typeof content !== 'string' || !content.trim()) {
      return json({ error: 'The AI returned an empty response' }, 502);
    }

    const parsed = parseResponse(content);

    const proposedIds = Array.isArray(parsed.product_ids)
      ? parsed.product_ids
      : [];

    const productIds: string[] = [];
    for (const id of proposedIds) {
      if (
        typeof id === 'string' &&
        catalogue.some((product) => product.id === id) &&
        !productIds.includes(id)
      ) {
        productIds.push(id);
      }
      if (productIds.length >= 6) break;
    }

    const reasoning = Array.isArray(parsed.reasoning)
      ? parsed.reasoning
          .filter((item): item is string =>
            typeof item === 'string' && item.length <= 300,
          )
          .slice(0, 6)
      : [];

    const answer =
      typeof parsed.message === 'string' && parsed.message.trim()
        ? parsed.message.slice(0, 4000)
        : 'I could not produce a complete answer. Please try again.';

    const selectedProducts = catalogue.filter((product) =>
      productIds.includes(product.id),
    );

    const total = selectedProducts.reduce(
      (sum, product) => sum + Math.max(0, Number(product.price) || 0),
      0,
    );

    const now = new Date().toISOString();

    return json({
      configured: true,
      result: {
        messages: [
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: answer,
            product_ids: productIds,
            reasoning,
            created_at: now,
          },
        ],
        product_ids: productIds,
        reasoning,
        engine: 'cloud-ai',
        model: MODEL,
        total_cost: total,
        currency: 'DZD',
      },
    });
  } catch {
    console.error('WASM chat processing failed');
    return json({ error: 'WASM could not process this message' }, 502);
  }
});
