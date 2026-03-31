import type { Handler } from '@netlify/functions';
import Stripe from 'stripe';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { tier = 'pro' } = JSON.parse(event.body || '{}');
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' as any });

  const priceId = tier === 'ultra'
    ? process.env.STRIPE_PRICE_ULTRA!
    : process.env.STRIPE_PRICE_PRO!;

  const origin = process.env.URL || `https://${event.headers.host}`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}&tier=${tier}`,
      cancel_url: `${origin}/`,
      allow_promotion_codes: true,
      metadata: { tier },
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err: any) {
    console.error('Stripe error:', err.message);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
