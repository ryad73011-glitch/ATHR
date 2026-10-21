import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const MODEL = 'openrouter/free';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const CATEGORIES = ['outerwear','tops','bottoms','dresses','knitwear','tailoring','shoes','bags','accessories','headwear'];
const AUDIENCES = ['women','men','unisex','unknown'];

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');
  if (!url || !anonKey) return json({ error: 'Supabase server configuration is incomplete' }, 500);
  if (!openRouterKey) return json({ error: 'OPENROUTER_API_KEY is not configured' }, 503);

  const token = req.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return json({ error: 'Authentication required' }, 401);
  const authClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: auth, error: authError } = await authClient.auth.getUser(token);
  if (authError || !auth.user) return json({ error: 'Invalid or expired session' }, 401);

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await req.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return json({ error: 'Invalid request body' }, 400);
    body = parsed as Record<string, unknown>;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const imageBase64 = body.imageBase64;
  const mimeType = body.mimeType;
  if (typeof imageBase64 !== 'string' || imageBase64.length < 100 || imageBase64.length > 5_500_000) {
    return json({ error: 'Image is missing or too large. Choose an image under 4 MB.' }, 400);
  }
  if (typeof mimeType !== 'string' || !['image/jpeg','image/png','image/webp'].includes(mimeType)) {
    return json({ error: 'Use a JPEG, PNG, or WebP product image.' }, 400);
  }

  try {
    const response = await fetch(OPENROUTER_URL, {
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
            content: 'You classify fashion product listing images for an e-commerce catalog. Inspect the PRODUCT, not the apparent gender/identity of any model. Infer target audience only from product design and listing context visible in the image. If unclear, use unknown. Do not infer gender from color alone. Return only JSON: {"category":"one allowed category","target_audience":"women|men|unisex|unknown","confidence":0.0,"colors":["short color names"],"universe":"CALM|CHAOS","description":"short factual visual description","review_required":true|false}. Confidence is 0 to 1. Set review_required true if audience or item type is ambiguous or confidence < 0.75. Allowed categories: outerwear,tops,bottoms,dresses,knitwear,tailoring,shoes,bags,accessories,headwear. CALM means classic/timeless/minimal; CHAOS means expressive/streetwear/bold. Do not invent brand, price, material, or size.'
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Classify this product image for ATHR. Return the required JSON only.' },
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 350,
      }),
    });

    if (!response.ok) {
      console.error(`OpenRouter product classifier returned HTTP ${response.status}`);
      return json({ error: 'Image analysis failed. You can retry or add the product for manual review.' }, 502);
    }

    const result = await response.json();
    const raw = result.choices?.[0]?.message?.content;
    if (typeof raw !== 'string') return json({ error: 'The image model returned no classification.' }, 502);
    let parsed: Record<string, unknown>;
    try {
      const start = raw.indexOf('{');
      const end = raw.lastIndexOf('}');
      if (start < 0 || end <= start) throw new Error('No JSON');
      parsed = JSON.parse(raw.slice(start, end + 1));
    } catch {
      return json({ error: 'The image model returned an unreadable classification. Please retry.' }, 502);
    }

    const categoryIsValid = CATEGORIES.includes(String(parsed.category));
    // Invalid model output must never silently become a confidently classified product.
    const category = categoryIsValid ? String(parsed.category) : 'tops';
    const confidence = typeof parsed.confidence === 'number' && Number.isFinite(parsed.confidence)
      ? Math.max(0, Math.min(1, parsed.confidence)) : 0;
    const audienceIsValid = AUDIENCES.includes(String(parsed.target_audience));
    const proposedAudience = audienceIsValid ? String(parsed.target_audience) : 'unknown';
    const targetAudience = confidence >= 0.75 && audienceIsValid ? proposedAudience : 'unknown';
    const colors = Array.isArray(parsed.colors)
      ? parsed.colors.filter((v): v is string => typeof v === 'string').slice(0, 5).map((v) => v.slice(0, 40))
      : [];
    const universe = parsed.universe === 'CHAOS' ? 'CHAOS' : 'CALM';
    const description = typeof parsed.description === 'string' ? parsed.description.slice(0, 300) : '';
    const reviewRequired = parsed.review_required === true || !categoryIsValid || !audienceIsValid ||
      confidence < 0.75 || targetAudience === 'unknown';

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
      }
    });
  } catch {
    console.error('Product image classification processing failed');
    return json({ error: 'Could not analyse this image. Please try again.' }, 502);
  }
});
