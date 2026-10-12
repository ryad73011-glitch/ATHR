// ATHR · create-checkout edge function (Deno).
//
// Payment provider architecture. Returns a hosted checkout URL only when a
// provider's credentials are configured; otherwise reports not_configured so the
// client shows an honest message. Supports Stripe today; Apple/Google billing is
// handled client-side and reconciled via the `subscriptions` table.

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });

const PRICES: Record<string, number> = { premium_monthly: 900, premium_annual: 9000 };

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } });
  }

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const priceIdMonthly = Deno.env.get('STRIPE_PRICE_MONTHLY');
  const priceIdAnnual = Deno.env.get('STRIPE_PRICE_ANNUAL');

  let body: { plan?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const plan = body.plan === 'premium_annual' ? 'premium_annual' : 'premium_monthly';

  if (!stripeKey || (plan === 'premium_monthly' ? !priceIdMonthly : !priceIdAnnual)) {
    return json({ url: null, status: 'not_configured', message: 'Payments are not configured. Add Stripe (or Apple/Google) credentials to enable checkout.' });
  }

  // Real Stripe checkout session.
  const priceId = plan === 'premium_monthly' ? priceIdMonthly : priceIdAnnual;
  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', authorization: `Bearer ${stripeKey}` },
    body: new URLSearchParams({
      mode: 'subscription',
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      success_url: `${Deno.env.get('APP_URL') ?? 'https://athr.app'}/profile/subscription?success=1`,
      cancel_url: `${Deno.env.get('APP_URL') ?? 'https://athr.app'}/profile/subscription?canceled=1`,
    }),
  });
  const session = await res.json();
  if (!res.ok) return json({ url: null, status: 'error', message: session?.error?.message ?? 'Stripe error' }, 502);
  return json({ url: session.url, status: 'url', amount: PRICES[plan] });
});
