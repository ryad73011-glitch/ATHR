import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const MODEL = 'openrouter/free';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const CATEGORIES = ['outerwear', 'tops', 'bottoms', 'dresses', 'knitwear', 'tailoring', 'shoes', 'bags', 'accessories', 'headwear'];
const AUDIENCES = ['women', 'men', 'unisex', 'unknown'];

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = 30_000,
): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
}

function readCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : 0;
}

function readCost(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');

  if (!url || !anonKey || !serviceKey) {
    return json({ error: 'Supabase server configuration is incomplete' }, 500);
  }

  const token = req.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return json({ error: 'Authentication required' }, 401);

  const authClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: auth, error: authError } = await authClient.auth.getUser(token);
  if (authError || !auth.user) return json({ error: 'Invalid or expired session' }, 401);

  if (!openRouterKey) return json({ error: 'AI image classification is not configured' }, 503);

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await req.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return json({ error: 'Invalid request body' }, 400);
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const imageBase64 = body.imageBase64;
  const mimeType = body.mimeType;
  if (
    typeof imageBase64 !== 'string' ||
    imageBase64.length < 100 ||
    imageBase64.length > 5_500_000 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(imageBase64)
  ) {
    return json({ error: 'Image is missing, invalid, or too large. Choose an image under 4 MB.' }, 400);
  }
  if (typeof mimeType !== 'string' || !['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
    return json({ error: 'Use a JPEG, PNG, or WebP product image.' }, 400);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const userId = auth.user.id;
  const { data: usageId, error: reservationError } = await supabase.rpc(
    'reserve_ai_usage',
    { p_user_id: userId, p_feature: 'classify-product-image' },
  );

  if (reservationError) {
    console.error('Product image usage reservation failed');
    return json({ error: 'AI usage controls are unavailable' }, 503);
  }
  if (typeof usageId !== 'string' || usageId.length === 0) {
    return json({ error: 'AI usage limit reached. Please try again later.' }, 429);
  }

  const started = Date.now();
  let promptTokens = 0;
  let completionTokens = 0;
  let providerCost: number | null = null;

  async function logUsage(status: 'ok' | 'error') {
    const { error } = await supabase
      .from('ai_usage')
      .update({
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        provider_cost: providerCost,
        latency_ms: Date.now() - started,
        status,
      })
      .eq('id', usageId)
      .eq('user_id', userId);

    if (error) console.error('Product image usage logging failed');
  }

  try {
    const response = await fetchWithTimeout(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openRouterKey}`,
        'HTTP-Referer': 'https://github.com/ryad73011-glitch/ATHR',
        'X-Title': 'ATHR Product Image Classifier',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'You classify fashion product listing images for an e-commerce catalogue. Inspect the product, not the apparent identity of any model. Infer target audience only from product design and listing context; if unclear, use unknown. Do not infer gender from colour alone. Return only JSON with category, target_audience, confidence, colors, universe, description, and review_required. Allowed categories: outerwear, tops, bottoms, dresses, knitwear, tailoring, shoes, bags, accessories, headwear. target_audience must be women, men, unisex, or unknown. universe must be CALM or CHAOS. Confidence is 0 to 1. Set review_required true if ambiguous or confidence < 0.75. Do not invent brand, price, material, or size.',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Classify this product image for ATHR. Return the required JSON only.' },
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 350,
      }),
    });

    if (!response.ok) {
      console.error(`OpenRouter product classifier returned HTTP ${response.status}`);
      await logUsage('error');
      return json({ error: 'Image analysis failed. You can retry or add the product for manual review.' }, 502);
    }

    const result = await response.json();
    const usage = result?.usage;
    promptTokens = readCount(usage?.prompt_tokens);
    completionTokens = readCount(usage?.completion_tokens);
    providerCost = readCost(usage?.cost);

    const raw = result?.choices?.[0]?.message?.content;
    if (typeof raw !== 'string') {
      await logUsage('error');
      return json({ error: 'The image model returned no classification.' }, 502);
    }

    let parsed: Record<string, unknown>;
    try {
      const start = raw.indexOf('{');
      const end = raw.lastIndexOf('}');
      if (start < 0 || end <= start) throw new Error('No JSON object');
      const value: unknown = JSON.parse(raw.slice(start, end + 1));
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('Invalid JSON object');
      }
      parsed = value as Record<string, unknown>;
    } catch {
      await logUsage('error');
      return json({ error: 'The image model returned an unreadable classification. Please retry.' }, 502);
    }

    const validCategory = typeof parsed.category === 'string' && CATEGORIES.includes(parsed.category);
    const category = validCategory ? parsed.category : 'tops';
    const confidenceIsValid =
      typeof parsed.confidence === 'number' &&
      Number.isFinite(parsed.confidence) &&
      parsed.confidence >= 0 &&
      parsed.confidence <= 1;
    const confidence = confidenceIsValid ? parsed.confidence as number : 0;
    const validAudience = typeof parsed.target_audience === 'string' && AUDIENCES.includes(parsed.target_audience);
    const proposedAudience = validAudience ? parsed.target_audience : 'unknown';
    const targetAudience = confidence >= 0.75 && validAudience ? proposedAudience : 'unknown';
    const colors = Array.isArray(parsed.colors)
      ? parsed.colors
          .filter((value): value is string => typeof value === 'string')
          .map((value) => value.slice(0, 40))
          .slice(0, 5)
      : [];
    const validUniverse = parsed.universe === 'CALM' || parsed.universe === 'CHAOS';
    const universe = parsed.universe === 'CHAOS' ? 'CHAOS' : 'CALM';
    const description = typeof parsed.description === 'string' ? parsed.description.slice(0, 300) : '';
    const reviewRequired =
      parsed.review_required === true ||
      !confidenceIsValid ||
      confidence < 0.75 ||
      targetAudience === 'unknown' ||
      !validCategory ||
      !validUniverse;

    await logUsage('ok');
    return json({
      classification: {
        category,
        target_audience: targetAudience,
        confidence,
        colors,
        universe,
        description,
        classification_status: reviewRequired ? 'review' : 'classified',
        review_required: reviewRequired,
        model: MODEL,
      },
    });
  } catch {
    await logUsage('error');
    console.error('Product image classification processing failed');
    return json({ error: 'Could not analyse this image. Please try again.' }, 502);
  }
});
