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

  // Reject obviously oversized requests before parsing. The text-length check also
  // covers requests without a trustworthy Content-Length header.
  const contentLength = Number(req.headers.get('content-length') ?? 0);
  const MAX_REQUEST_BYTES = 16 * 1024;

  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return json({ error: 'Request body too large' }, 413);
  }

  let body: Record<string, unknown>;

  try {
    // Read the body incrementally so a missing or dishonest Content-Length
    // cannot force an unbounded allocation before the size check.
    const reader = req.body?.getReader();

    if (!reader) {
      return json({ error: 'Invalid JSON body' }, 400);
    }

    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;
      if (!value) continue;

      totalBytes += value.byteLength;

      if (totalBytes > MAX_REQUEST_BYTES) {
        await reader.cancel();
        return json({ error: 'Request body too large' }, 413);
      }

      chunks.push(value);
    }

    const bodyBytes = new Uint8Array(totalBytes);
    let offset = 0;

    for (const chunk of chunks) {
      bodyBytes.set(chunk, offset);
      offset += chunk.byteLength;
    }

    const rawBody = new TextDecoder().decode(bodyBytes);
    const parsed: unknown = JSON.parse(rawBody);

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

  const started = Date.now();

  async function logUsage(
    status: 'ok' | 'error' | 'fallback',
  ) {
    const { error } = await supabase
      .from('ai_usage')
      .insert({
        user_id: userId,
        model: MODEL,
        provider: PROVIDER,
        latency_ms: Date.now() - started,
        status,
      });

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
        'id,title,brand,category,universe,price,currency,in_stock',
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
  'You are WASM, the personal AI assistant inside the ATHR app.',
  'You are a general-purpose conversational assistant, not only a shopping or fashion bot.',
  'Answer general knowledge questions about science, history, culture, technology, language, relationships, learning, and everyday life naturally and helpfully.',
  'Reply in the language used by the user. Understand Algerian Darija, Arabic, French, and English when possible.',
  'For general questions, answer directly. Do not require products or catalogue results.',
  'Act as a personal style coach when the user asks about clothing, appearance, outfits, or personal style.',
  'Help the user discover their preferences through respectful follow-up questions about lifestyle, taste, comfort, budget, and goals.',
  'Do not claim to diagnose personality or determine character from facial appearance.',
  'For appearance advice, use only information the user provides, such as height, fit preferences, body proportions, desired look, and optional photos when image analysis is actually supported.',
  'Do not claim to see or analyse an image unless image content is actually provided to the model.',
  'Recommend products only when relevant to the request and only from the supplied catalogue.',
  'Never invent product IDs, prices, stock status, or purchase links.',
  'If the catalogue is empty or no product fits, still answer the user with practical advice and explain briefly that no matching ATHR products are currently available.',
  'Return one valid JSON object without Markdown, using exactly these keys: product_ids, reasoning, message.',
  'product_ids must contain only IDs from the supplied catalogue and may be an empty array.',
  'reasoning must be an array of short strings; it may be empty.',
  'message must contain the actual helpful answer, not a generic no-products error.',
  'Recommend no more than 6 products.',
  'Respect the requested budget and currency when recommending products.',
  'Never fabricate facts. State uncertainty when needed.',
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
      })),
    });

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      signal: AbortSignal.timeout(20_000),
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
