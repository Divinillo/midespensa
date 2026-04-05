import Stripe from 'stripe';

interface Env {
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
}

// Web Crypto — compatible con Cloudflare Workers (sin Node.js crypto)
function generateKey(): string {
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
    .match(/.{4}/g)!
    .join('-');
}

async function createLicense(
  env: Env,
  clave: string,
  email: string,
  sessionId: string,
) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/licencias`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({
      clave, email, tier: 'pro', activa: true,
      session_id: sessionId,
      created_at: new Date().toISOString(),
    }),
  });
  if (!res.ok) throw new Error(await res.text());
}

async function setLicenseActive(env: Env, email: string, activa: boolean) {
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/licencias?email=eq.${encodeURIComponent(email)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ activa }),
    }
  );
  if (!res.ok) throw new Error(await res.text());
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-04-10' as any,
  });

  const sig     = request.headers.get('stripe-signature') ?? '';
  const rawBody = await request.text();

  let stripeEvent: Stripe.Event;
  try {
    stripeEvent = await stripe.webhooks.constructEventAsync(
      rawBody,
      sig,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err: any) {
    console.error('Webhook signature error:', err.message);
    return new Response('Webhook signature verification failed', { status: 400 });
  }

  // ── checkout.session.completed: new subscriber ─────────────────
  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object as Stripe.CheckoutSession;
    const email   = session.customer_details?.email ?? session.customer_email ?? '';
    const clave   = generateKey();

    try {
      await createLicense(env, clave, email, session.id);
      console.log(`✅ License created for ${email}`);
    } catch (err: any) {
      console.error('License creation failed:', err.message);
    }
  }

  // ── customer.subscription.deleted: cancelled/expired ───────────
  if (stripeEvent.type === 'customer.subscription.deleted') {
    const subscription = stripeEvent.data.object as Stripe.Subscription;
    const customerId = typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id;

    try {
      const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
      const email = customer.email ?? '';
      if (email) {
        await setLicenseActive(env, email, false);
        console.log(`❌ License revoked for ${email} (subscription deleted)`);
      }
    } catch (err: any) {
      console.error('License revoke failed:', err.message);
    }
  }

  // ── invoice.payment_failed: payment failure ─────────────────────
  if (stripeEvent.type === 'invoice.payment_failed') {
    const invoice = stripeEvent.data.object as Stripe.Invoice;
    const customerId = typeof invoice.customer === 'string'
      ? invoice.customer
      : (invoice.customer as any)?.id ?? '';

    try {
      const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
      const email = customer.email ?? '';
      if (email) {
        await setLicenseActive(env, email, false);
        console.log(`⚠️ License suspended for ${email} (payment failed)`);
      }
    } catch (err: any) {
      console.error('License suspend failed:', err.message);
    }
  }

  // ── customer.subscription.updated: reactivation ────────────────
  if (stripeEvent.type === 'customer.subscription.updated') {
    const subscription = stripeEvent.data.object as Stripe.Subscription;
    const isActive = subscription.status === 'active' || subscription.status === 'trialing';
    const customerId = typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id;

    try {
      const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
      const email = customer.email ?? '';
      if (email) {
        await setLicenseActive(env, email, isActive);
        console.log(`🔄 License ${isActive ? 'reactivated' : 'suspended'} for ${email}`);
      }
    } catch (err: any) {
      console.error('License update failed:', err.message);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const onRequestGet: PagesFunction = async () =>
  new Response('Method Not Allowed', { status: 405 });
