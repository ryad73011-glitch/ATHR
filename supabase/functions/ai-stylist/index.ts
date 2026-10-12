// ATHR · ai-stylist edge function (Deno).
//
// Secure server-side AI styling. Credentials live ONLY in function secrets,
// never in the client. The model is grounded on real products pulled from the
// database and is instructed to answer with product ids it was given, so it can
// never invent prices, stock or links. If no provider key is configured the
// function returns { configured:false } and the client degrades to its
// on-device engine, clearly labelled.

import { createClient } from 'npm:@supabase/supabase-js@2';

interface StudioRequest {
  occasion: string;
  budget: number;
  currency: string;
  universes: string[];
  palette: string[];
  note: string;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } });
  }

  const provider = Deno.env.get('AI_PROVIDER') ?? 'openai';
  const apiKey = Deno.env.get('AI_API_KEY');
  const model = Deno.env.get('AI_MODEL') ?? (provider === 'anthropic' ? 'claude-sonnet-4-5' : 'gpt-4o-mini');

  let body: StudioRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid body' }, 400);
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // Grounding: only real products.
  let query = supabase.from('products').select('id,title,brand,category,universe,price,currency,in_stock').eq('in_stock', true).limit(60);
  if (body.universes?.length) query = query.in('universe', body.universes);
  const { data: products } = await query;
  const catalogue = products ?? [];

  const started = Date.now();

  if (!apiKey) {
    await supabase.from('ai_usage').insert({ user_id: '00000000-0000-0000-0000-000000000000', model, provider, status: 'fallback' });
    return json({ configured: false, result: null });
  }

  const system =
    'You are ATHR, a fashion stylist. You MUST choose only from the provided product ids. ' +
    'Return strict JSON: {"product_ids":[...],"reasoning":[...],"message":"..."} with 3-6 products within the budget. Never invent products.';

  const userPrompt = JSON.stringify({
    request: body,
    products: catalogue.map((p) => ({ id: p.id, title: p.title, brand: p.brand, category: p.category, universe: p.universe, price: p.price, currency: p.currency })),
  });

  try {
    let content = '';
    if (provider === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model, max_tokens: 800, system, messages: [{ role: 'user', content: userPrompt }] }),
      });
      const data = await res.json();
      content = (data.content ?? []).map((c: { text?: string }) => c.text ?? '').join('');
    } else {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: system }, { role: 'user', content: userPrompt }] }),
      });
      const data = await res.json();
      content = data.choices?.[0]?.message?.content ?? '';
    }

    const parsed = JSON.parse(content);
    const validIds = new Set(catalogue.map((p) => p.id));
    const chosen = (parsed.product_ids ?? []).filter((id: string) => validIds.has(id));
    const chosenProducts = catalogue.filter((p) => chosen.includes(p.id));
    const total = chosenProducts.reduce((s: number, p) => s + (p.price as number), 0);

    const result = {
      messages: [{ id: crypto.randomUUID(), role: 'assistant', content: parsed.message ?? 'Here is your look.', product_ids: chosen, reasoning: parsed.reasoning ?? [], created_at: new Date().toISOString() }],
      product_ids: chosen,
      reasoning: parsed.reasoning ?? [],
      engine: 'cloud-ai',
      model,
      total_cost: total,
      currency: body.currency ?? 'DZD',
    };

    await supabase.from('ai_usage').insert({ user_id: '00000000-0000-0000-0000-000000000000', model, provider, latency_ms: Date.now() - started, status: 'ok' });
    return json({ configured: true, result });
  } catch (e) {
    await supabase.from('ai_usage').insert({ user_id: '00000000-0000-0000-0000-000000000000', model, provider, status: 'error' });
    return json({ configured: true, result: null, error: String(e) });
  }
});
