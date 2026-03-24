const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Genera una clave de licencia única
function generarClave(tier) {
  const prefix = tier === 'ultra' ? 'CHEF' : 'DESP';
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const rand = (n) => Array.from({length: n}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${prefix}-${rand(4)}-${rand(4)}-${rand(4)}`;
}

// Envía email con la clave via Supabase (o simplemente la guarda)
async function guardarLicencia(email, tier, stripeCustomerId, stripeSubscriptionId) {
  const clave = generarClave(tier);

  const { error } = await supabase
    .from('licencias')
    .insert({
      email,
      clave,
      tier,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId,
      activa: true,
    });

  if (error) throw new Error(`Supabase insert error: ${error.message}`);
  return clave;
}

async function desactivarLicencia(stripeSubscriptionId) {
  const { error } = await supabase
    .from('licencias')
    .update({ activa: false })
    .eq('stripe_subscription_id', stripeSubscriptionId);

  if (error) console.error('Error desactivando licencia:', error.message);
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const sig = event.headers['stripe-signature'];
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  try {
    switch (stripeEvent.type) {

      // Suscripción creada y pago confirmado → generar clave
      case 'checkout.session.completed': {
        const session = stripeEvent.data.object;
        if (session.mode !== 'subscription') break;

        const tier = session.metadata?.tier || 'pro';
        const email = session.customer_email || session.customer_details?.email;
        const customerId = session.customer;
        const subscriptionId = session.subscription;

        if (!email) {
          console.error('No email en session:', session.id);
          break;
        }

        const clave = await guardarLicencia(email, tier, customerId, subscriptionId);
        console.log(`✅ Licencia ${tier} creada para ${email}: ${clave}`);

        // Aquí puedes añadir envío de email con la clave (Resend, SendGrid, etc.)
        // Por ahora la clave queda en Supabase y el usuario la puede ver en su panel
        break;
      }

      // Suscripción cancelada o pago fallido → desactivar clave
      case 'customer.subscription.deleted':
      case 'customer.subscription.updated': {
        const subscription = stripeEvent.data.object;
        if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
          await desactivarLicencia(subscription.id);
          console.log(`❌ Licencia desactivada para suscripción: ${subscription.id}`);
        }
        break;
      }

      default:
        console.log(`Evento no manejado: ${stripeEvent.type}`);
    }

    return { statusCode: 200, body: JSON.stringify({ received: true }) };

  } catch (err) {
    console.error('Error procesando webhook:', err);
    return { statusCode: 500, body: err.message };
  }
};
