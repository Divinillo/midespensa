interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const session_id = new URL(request.url).searchParams.get('session_id');
  if (!session_id || session_id.length < 10) {
    return new Response(JSON.stringify({ error: 'Missing session_id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Fetch only the tier — never expose clave or email to the client
    const res = await fetch(
      `${env.SUPABASE_URL}/rest/v1/licencias?session_id=eq.${encodeURIComponent(session_id)}&activa=eq.true&select=tier&limit=1`,
      { headers: { 'apikey': env.SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}` } },
    );
    const rows = await res.json() as any[];

    if (!Array.isArray(rows) || rows.length === 0) {
      // Webhook may not have arrived yet — client will retry
      return new Response(JSON.stringify({ error: 'License not ready yet' }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Return only the tier — clave and email stay server-side
    return new Response(JSON.stringify({ ok: true, tier: rows[0].tier }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const onRequestPost: PagesFunction = async () =>
  new Response('Method Not Allowed', { status: 405 });
