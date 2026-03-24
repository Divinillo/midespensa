const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const PRICES = {
  pro:   process.env.STRIPE_PRICE_PRO,   // price_1TE61BQpspZGO6cXyEYtadWF
  ultra: process.env.STRIPE_PRICE_ULTRA, // price_1TE626QpspZGO6cXrC1I4r6r
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Bad Request' };
  }

  const { tier, email } = body;

  if (!tier || !PRICES[tier]) {
    return { statusCode: 400, body: 'Tier inválido. Usa "pro" o "ultra".' };
  }

  const baseUrl = process.env.URL || 'https://comefacil.netlify.app';

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email || undefined,
      line_items: [{ price: PRICES[tier], quantity: 1 }],
      success_url: `${baseUrl}/success.html?session_id={CHECKOUT_SESSION_ID}&tier=${tier}`,
      cancel_url:  `${baseUrl}/index.html?cancelled=true`,
      metadata: { tier },
      subscription_data: {
        metadata: { tier },
      },
      locale: 'es',
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    console.error('Stripe error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
