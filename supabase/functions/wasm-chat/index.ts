
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

type ChatImage = {
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  base64: string;
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
  const rawImages = body.images ?? [];
  const universe = body.universe;

  if (!Array.isArray(rawImages) || rawImages.length > 4) {
    return json({ error: 'Attach no more than 4 images' }, 400);
  }

  const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
  const images: ChatImage[] = [];
  let totalImageCharacters = 0;

  for (const item of rawImages) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return json({ error: 'Invalid image payload' }, 400);
    }
    const candidate = item as Record<string, unknown>;
    if (
      typeof candidate.mimeType !== 'string' ||
      !allowedMimeTypes.has(candidate.mimeType) ||
      typeof candidate.base64 !== 'string' ||
      candidate.base64.length === 0 ||
      candidate.base64.length > 4_500_000 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(candidate.base64)
    ) {
      return json({ error: 'Invalid or oversized image' }, 400);
    }
    totalImageCharacters += candidate.base64.length;
    if (totalImageCharacters > 4_500_000) {
      return json({ error: 'Images are too large; attach smaller photos' }, 413);
    }
    images.push({
      mimeType: candidate.mimeType as ChatImage['mimeType'],
      base64: candidate.base64,
    });
  }

  if (
    typeof message !== 'string' ||
    (!message.trim() && images.length === 0) ||
    message.length > 2000
  ) {
    return json({ error: 'Enter a message or attach an image; text must be under 2000 characters' }, 400);
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

  const history = (rawHistory as ChatMessage[]).slice(-12);

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Enforce AI plan allowances on the server; never trust a client-supplied tier.
  const { data: quotaRows, error: quotaError } = await supabase.rpc('consume_ai_request', {
    p_user_id: auth.user.id,
  });
  if (quotaError) {
    console.error('AI usage quota check failed');
    return json({ error: 'AI usage limits are temporarily unavailable. Please retry.' }, 503);
  }
  const quota = Array.isArray(quotaRows) ? quotaRows[0] : quotaRows;
  if (!quota || quota.allowed !== true) {
    return json({
      error: 'Daily AI request limit reached. Upgrade to ATHR Premium for a higher allowance.',
      code: 'AI_DAILY_LIMIT',
      usage: quota ? { used: quota.used, daily_limit: quota.daily_limit, plan: quota.plan } : null,
    }, 429);
  }

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
      'For fashion questions, give practical styling advice.',
      'Recommend ATHR products only when relevant and only from the supplied catalogue.',
      'Never invent product IDs, prices, stock status or availability.',
      'When images are attached, inspect their visible contents and describe clothing, colors, fit, silhouette, style, and practical outfit improvements. Be clear when details are uncertain.',
      'Never infer sensitive personal traits from a person in an image.',
      'Use the conversation history to understand follow-up messages.',
      'Return only one valid JSON object with keys: message, product_ids, reasoning.',
      'message must be a useful natural-language answer.',
      'product_ids must contain only IDs from the supplied catalogue, maximum 6; use an empty array when products are irrelevant.',
      'reasoning must be an array of short strings.',
      'Do not claim to have placed orders, contacted stores or performed actions you did not perform.',
    ].join(' ');

    const userContent: string | Array<Record<string, unknown>> = images.length
      ? [
          { type: 'text', text: message.trim() || 'Analyse this image for personal styling. Describe the visible clothing and suggest practical improvements.' },
          ...images.map((image) => ({
            type: 'image_url',
            image_url: {
              url: `data:${image.mimeType};base64,${image.base64}`,
            },
          })),
        ]
      : message.trim();

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
              `Selected universe: ${universe ?? 'CALM'}. ` +
              `Available products (DZD, in stock): ${JSON.stringify(catalogue)}`,
          },
          ...history.map((item) => ({
            role: item.role,
            content: item.content,
          })),
          { role: 'user', content: userContent },
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
