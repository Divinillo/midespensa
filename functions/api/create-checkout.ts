import Stripe from 'stripe';

interface Env {
  STRIPE_SECRET_KEY: string;
  STRIPE_PRICE_MONTHLY: string;
  STRIPE_PRICE_YEARLY: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // ── JWT verification ───────────────────────────────────────────
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }

  const authRes = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      'apikey': env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!authRes.ok) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }
  const authUser = await authRes.json() as { email?: string };
  if (!authUser.email) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }

  // Use verified email from JWT — ignore any email in request body
  const verifiedEmail = authUser.email;

  const { period = 'monthly' } = await request.json() as any;
  const safePeriod = period === 'yearly' ? 'yearly' : 'monthly';

  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-04-10' as any,
  });

  const priceId = safePeriod === 'yearly' ? env.STRIPE_PRICE_YEARLY : env.STRIPE_PRICE_MONTHLY;
  const origin  = new URL(request.url).origin;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${origin}/`,
      allow_promotion_codes: true,
      metadata: { period: safePeriod },
      // Lock the email to the authenticated Supabase account
      customer_email: verifiedEmail,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Could not create checkout session' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const onRequestGet: PagesFunction = async () =>
  new Response('Method Not Allowed', { status: 405 });
