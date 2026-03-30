import Stripe from 'stripe';

interface Env {
  STRIPE_SECRET_KEY: string;
  STRIPE_PRICE_PRO: string;
  STRIPE_PRICE_ULTRA: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const { tier = 'pro', email } = await request.json() as any;

  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-04-10' as any,
  });

  const priceId = tier === 'ultra' ? env.STRIPE_PRICE_ULTRA : env.STRIPE_PRICE_PRO;
  const origin  = new URL(request.url).origin;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}&tier=${tier}`,
      cancel_url:  `${origin}/`,
      allow_promotion_codes: true,
      metadata: { tier },
      // Pre-fill and lock the email so the webhook always gets the Supabase account email
      ...(email ? { customer_email: email } : {}),
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Stripe error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const onRequestGet: PagesFunction = async () =>
  new Response('Method Not Allowed', { status: 405 });
