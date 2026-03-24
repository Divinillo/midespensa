const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event) => {
  const sessionId = event.queryStringParameters?.session_id;

  if (!sessionId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'session_id requerido' }) };
  }

  try {
    // Obtener email del cliente desde Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const email = session.customer_email || session.customer_details?.email;

    if (!email) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Email no encontrado' }) };
    }

    // Buscar licencia en Supabase por email y suscripción
    const { data, error } = await supabase
      .from('licencias')
      .select('clave, tier')
      .eq('email', email)
      .eq('activa', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Licencia no encontrada aún, revisa tu email.' })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clave: data.clave, tier: data.tier, email }),
    };

  } catch (err) {
    console.error('Error get-license:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
