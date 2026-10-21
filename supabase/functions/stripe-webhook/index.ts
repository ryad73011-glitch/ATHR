import { createClient } from 'npm:@supabase/supabase-js@2';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function verifyStripeSignature(payload: string, signatureHeader: string, secret: string) {
  const parts = signatureHeader.split(',').map((part) => part.trim().split('='));
  const timestamp = parts.find(([key]) => key === 't')?.[1];
  const signatures = parts.filter(([key]) => key === 'v1').map(([, value]) => value);
  if (!timestamp || signatures.length === 0 || !/^\d+$/.test(timestamp)) return false;
  // Reject stale webhook deliveries; Stripe retries with a fresh timestamp.
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const digest = hex(new Uint8Array(await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${timestamp}.${payload}`),
  )));
  return signatures.some((signature) => constantTimeEqual(signature, digest));
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!webhookSecret || !supabaseUrl || !serviceRoleKey) {
    console.error('Stripe webhook server configuration is incomplete');
    return json({ error: 'Server configuration error' }, 500);
  }

  const rawBody = await req.text();
  const signature = req.headers.get('stripe-signature') ?? '';
  if (!(await verifyStripeSignature(rawBody, signature, webhookSecret))) {
    return json({ error: 'Invalid webhook signature' }, 400);
  }

  let event: { type?: string; data?: { object?: Record<string, unknown> } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return json({ error: 'Invalid event body' }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const object = event.data?.object ?? {};

  if (event.type === 'checkout.session.completed') {
    if (object.mode !== 'subscription') return json({ received: true });
    const paymentStatus = object.payment_status;
    if (paymentStatus !== 'paid' && paymentStatus !== 'no_payment_required') {
      return json({ received: true, ignored: 'payment_not_complete' });
    }
    const userId = typeof object.client_reference_id === 'string'
      ? object.client_reference_id
      : (object.metadata as Record<string, unknown> | undefined)?.user_id;
    const plan = (object.metadata as Record<string, unknown> | undefined)?.plan;
    const subscriptionId = object.subscription;
    if (
      typeof userId !== 'string' ||
      typeof plan !== 'string' ||
      !['premium_monthly', 'premium_annual'].includes(plan) ||
      typeof subscriptionId !== 'string'
    ) {
      console.error('Checkout session is missing required user/plan/subscription metadata');
      return json({ error: 'Invalid subscription metadata' }, 400);
    }
    // A checkout completion alone does not establish the current renewal period;
    // fetch the signed subscription event separately before granting access.
    return json({ received: true, awaiting_subscription_event: true });
  }

  if (event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted') {
    const metadata = object.metadata as Record<string, unknown> | undefined;
    const audience = metadata?.audience;
    const plan = metadata?.plan;
    const userId = metadata?.user_id;
    const merchantId = metadata?.merchant_id;
    const rawStatus = object.status;
    const status = event.type === 'customer.subscription.deleted'
      ? 'canceled'
      : rawStatus === 'active' || rawStatus === 'trialing'
        ? 'active'
        : rawStatus === 'past_due' || rawStatus === 'unpaid'
          ? 'past_due'
          : 'canceled';
    const periodEnd = typeof object.current_period_end === 'number'
      ? new Date(object.current_period_end * 1000).toISOString()
      : null;

    if (audience === 'merchant') {
      if (
        typeof merchantId !== 'string' ||
        typeof userId !== 'string' ||
        typeof plan !== 'string' ||
        !['merchant_starter', 'merchant_growth', 'merchant_flagship'].includes(plan)
      ) {
        console.error('Merchant subscription event missing required metadata');
        return json({ received: true, ignored: 'missing_metadata' });
      }
      const merchantPlan = plan.replace('merchant_', '');
      // Verify the owner is unchanged before granting a paid shop tier.
      const { data: merchant, error: merchantError } = await supabase
        .from('merchants').select('id,owner_id').eq('id', merchantId).maybeSingle();
      if (merchantError || !merchant || merchant.owner_id !== userId) {
        console.error('Merchant subscription owner verification failed');
        return json({ error: 'Merchant ownership verification failed' }, 403);
      }
      const { error } = await supabase.from('merchant_subscriptions').upsert({
        merchant_id: merchantId,
        plan: merchantPlan,
        status,
        provider: 'stripe',
        current_period_end: periodEnd,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'merchant_id' });
      if (error) {
        console.error('Could not update merchant subscription state');
        return json({ error: 'Merchant subscription update failed' }, 500);
      }
      return json({ received: true });
    }

    if (
      typeof userId !== 'string' ||
      typeof plan !== 'string' ||
      !['premium_monthly', 'premium_annual'].includes(plan)
    ) {
      console.error('Subscription event missing required user/plan metadata');
      return json({ received: true, ignored: 'missing_metadata' });
    }
    const { error } = await supabase.from('subscriptions').upsert({
      user_id: userId,
      plan,
      status,
      provider: 'stripe',
      current_period_end: periodEnd,
    }, { onConflict: 'user_id' });
    if (error) {
      console.error('Could not update subscription state from Stripe webhook');
      return json({ error: 'Subscription state update failed' }, 500);
    }
    return json({ received: true });
  }

  return json({ received: true, ignored: 'event_not_used' });
});
