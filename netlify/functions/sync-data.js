const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json' };

  if (event.httpMethod === 'GET') {
    // Recuperar datos del usuario por email
    const email = event.queryStringParameters?.email;
    if (!email) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Email requerido' }) };

    // Verificar que el email tiene licencia activa
    const { data: lic } = await supabase
      .from('licencias')
      .select('tier, activa')
      .eq('email', email)
      .eq('activa', true)
      .limit(1)
      .single();

    if (!lic) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Sin licencia activa' }) };

    const { data, error } = await supabase
      .from('user_data')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Sin datos guardados' }) };

    return { statusCode: 200, headers, body: JSON.stringify({ ...data, tier: lic.tier }) };
  }

  if (event.httpMethod === 'POST') {
    // Guardar/actualizar datos del usuario
    let body;
    try { body = JSON.parse(event.body); } catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON inválido' }) }; }

    const { email, dishes, ingredients, tickets, price_history, plan } = body;
    if (!email) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Email requerido' }) };

    // Verificar licencia activa
    const { data: lic } = await supabase
      .from('licencias')
      .select('tier')
      .eq('email', email)
      .eq('activa', true)
      .limit(1)
      .single();

    if (!lic) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Sin licencia activa' }) };

    const { error } = await supabase
      .from('user_data')
      .upsert({
        email,
        dishes:        dishes        ?? [],
        ingredients:   ingredients   ?? [],
        tickets:       tickets       ?? [],
        price_history: price_history ?? {},
        plan:          plan          ?? {},
        tier:          lic.tier,
        updated_at:    new Date().toISOString(),
      }, { onConflict: 'email' });

    if (error) return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
};
