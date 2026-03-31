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
  tier: string,
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
      clave, email, tier, activa: true,
      session_id: sessionId,
      created_at: new Date().toISOString(),
    }),
  });
  if (!res.ok) throw new Error(await res.text());
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-04-10' as any,
  });

  const sig     = request.headers.get('stripe-signature') ?? '';
  // Leer el body RAW antes de cualquier parseo — necesario para verificar firma
  const rawBody = await request.text();

  let stripeEvent: Stripe.Event;
  try {
    // En Workers, Stripe SDK usa Web Crypto para verificar la firma (no Node.js crypto)
    stripeEvent = await stripe.webhooks.constructEventAsync(
      rawBody,
      sig,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err: any) {
    console.error('Webhook signature error:', err.message);
    return new Response('Webhook signature verification failed', { status: 400 });
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object as Stripe.CheckoutSession;
    const email   = session.customer_details?.email ?? session.customer_email ?? '';
    const tier    = session.metadata?.tier ?? 'pro';
    const clave   = generateKey();

    try {
      await createLicense(env, clave, email, tier, session.id);
      console.log(`✅ License ${clave} → ${email} (${tier})`);
    } catch (err: any) {
      console.error('License creation failed:', err.message);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const onRequestGet: PagesFunction = async () =>
  new Response('Method Not Allowed', { status: 405 });
