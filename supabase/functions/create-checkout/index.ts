import { createClient } from 'npm:@supabase/supabase-js@2';

// Hosted checkout stays disabled until trusted provider credentials are configured.
// Subscription entitlements are only granted by a verified provider webhook.
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

const PLANS = {
  premium_monthly: { amount: 900, env: 'STRIPE_PRICE_MONTHLY' },
  premium_annual: { amount: 9000, env: 'STRIPE_PRICE_ANNUAL' },
} as const;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !anonKey) return json({ error: 'Server configuration error' }, 500);

  const token = req.headers.get('Authorization')?.match(/^Bearer\\s+(.+)$/i)?.[1];
  if (!token) return json({ error: 'Authentication required' }, 401);

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) return json({ error: 'Invalid or expired session' }, 401);

  let body: { plan?: string };
  try {
    const parsed: unknown = await req.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return json({ error: 'Invalid request body' }, 400);
    }
    body = parsed as { plan?: string };
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  if (body.plan !== 'premium_monthly' && body.plan !== 'premium_annual') {
    return json({ error: 'Unsupported plan' }, 400);
  }
  const plan = body.plan;
  const price = PLANS[plan];
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const stripePriceId = Deno.env.get(price.env);

  if (!stripeKey || !stripePriceId) {
    return json({
      url: null,
      status: 'not_configured',
      message: 'Payments are not configured. No subscription has been created or charged.',
    });
  }

  const appUrl = Deno.env.get('APP_URL') ?? 'https://athr.app';
  const params = new URLSearchParams({
    mode: 'subscription',
    'line_items[0][price]': stripePriceId,
    'line_items[0][quantity]': '1',
    client_reference_id: authData.user.id,
    'metadata[user_id]': authData.user.id,
    'metadata[plan]': plan,
    'subscription_data[metadata][user_id]': authData.user.id,
    'subscription_data[metadata][plan]': plan,
    success_url: `${appUrl}/profile/subscription?success=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/profile/subscription?canceled=1`,
  });

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      authorization: `Bearer ${stripeKey}`,
    },
    body: params,
    signal: AbortSignal.timeout(15_000),
  });
  const session = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('Stripe checkout session creation failed', res.status);
    return json({ url: null, status: 'error', message: 'Checkout could not be created' }, 502);
  }
  return json({ url: session.url, status: 'url', amount: price.amount });
});
