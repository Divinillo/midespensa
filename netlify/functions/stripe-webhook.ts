import type { Handler } from '@netlify/functions';
import Stripe from 'stripe';
import { randomBytes } from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;

function generateKey(): string {
  return randomBytes(8).toString('hex').toUpperCase().match(/.{4}/g)!.join('-');
}

async function createLicense(clave: string, email: string, tier: string, sessionId: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/licencias`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ clave, email, tier, activa: true, session_id: sessionId, created_at: new Date().toISOString() }),
  });
  if (!res.ok) throw new Error(await res.text());
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' as any });
  const sig = event.headers['stripe-signature'] || '';

  // Netlify passes body as string; if base64 encoded, decode it
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body || '', 'base64').toString('utf8')
    : (event.body || '');

  let stripeEvent: Stripe.Event;
  try {
    stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error('Webhook signature error:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object as Stripe.CheckoutSession;
    const email = session.customer_details?.email ?? session.customer_email ?? '';
    const tier = session.metadata?.tier ?? 'pro';
    const clave = generateKey();

    try {
      await createLicense(clave, email, tier, session.id);
      console.log(`✅ License ${clave} → ${email} (${tier})`);
    } catch (err: any) {
      console.error('License creation failed:', err.message);
    }
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
