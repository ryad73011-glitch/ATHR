import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const PLANS: Record<string, { amount: number; priceEnv: string; audience: 'ai' | 'merchant' }> = {
  premium_monthly: { amount: 900, priceEnv: 'STRIPE_PRICE_MONTHLY', audience: 'ai' },
  premium_annual: { amount: 9000, priceEnv: 'STRIPE_PRICE_ANNUAL', audience: 'ai' },
  merchant_starter: { amount: 1500, priceEnv: 'STRIPE_PRICE_MERCHANT_STARTER', audience: 'merchant' },
  merchant_growth: { amount: 4500, priceEnv: 'STRIPE_PRICE_MERCHANT_GROWTH', audience: 'merchant' },
  merchant_flagship: { amount: 10000, priceEnv: 'STRIPE_PRICE_MERCHANT_FLAGSHIP', audience: 'merchant' },
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: 'Server configuration error' }, 500);

  const token = req.headers.get('Authorization')?.match(/^Bearer\\s+(.+)$/i)?.[1];
  if (!token) return json({ error: 'Authentication required' }, 401);
  const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) return json({ error: 'Invalid or expired session' }, 401);

  let body: { plan?: string; merchant_id?: string };
  try {
    const parsed: unknown = await req.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return json({ error: 'Invalid request body' }, 400);
    body = parsed as { plan?: string; merchant_id?: string };
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const planId = body.plan ?? '';
  const plan = PLANS[planId];
  if (!plan) return json({ error: 'Unsupported plan' }, 400);

  const service = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  if (plan.audience === 'merchant') {
    if (!body.merchant_id) return json({ error: 'merchant_id required for merchant plans' }, 400);
    const { data: merchant, error } = await service.from('merchants')
      .select('id,owner_id').eq('id', body.merchant_id).maybeSingle();
    if (error || !merchant || merchant.owner_id !== authData.user.id) {
      return json({ error: 'You are not authorised to subscribe this shop' }, 403);
    }
  }

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const stripePriceId = Deno.env.get(plan.priceEnv);
  if (!stripeKey || !stripePriceId) {
    return json({ url: null, status: 'not_configured', message: 'Payments are not configured. No subscription has been created or charged.' });
  }

  const appUrl = Deno.env.get('APP_URL') ?? 'https://athr.app';
  const params = new URLSearchParams({
    mode: 'subscription',
    'line_items[0][price]': stripePriceId,
    'line_items[0][quantity]': '1',
    client_reference_id: authData.user.id,
    'metadata[user_id]': authData.user.id,
    'metadata[plan]': planId,
    'metadata[audience]': plan.audience,
    'subscription_data[metadata][user_id]': authData.user.id,
    'subscription_data[metadata][plan]': planId,
    'subscription_data[metadata][audience]': plan.audience,
    success_url: `${appUrl}/profile/subscription?success=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/profile/subscription?canceled=1`,
  });
  if (body.merchant_id) {
    params.set('metadata[merchant_id]', body.merchant_id);
    params.set('subscription_data[metadata][merchant_id]', body.merchant_id);
  }

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', authorization: `Bearer ${stripeKey}` },
    body: params,
    signal: AbortSignal.timeout(15_000),
  });
  const session = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('Stripe checkout session creation failed', res.status);
    return json({ url: null, status: 'error', message: 'Checkout could not be created' }, 502);
  }
  return json({ url: session.url, status: 'url', amount: plan.amount, currency: 'DZD', plan: planId });
});
