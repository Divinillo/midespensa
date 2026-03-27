interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const session_id = new URL(request.url).searchParams.get('session_id');
  if (!session_id) {
    return new Response(JSON.stringify({ error: 'Missing session_id' }), { status: 400 });
  }

  try {
    const res = await fetch(
      `${env.SUPABASE_URL}/rest/v1/licencias?session_id=eq.${encodeURIComponent(session_id)}&activa=eq.true&select=clave,email,tier&limit=1`,
      { headers: { 'apikey': env.SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}` } },
    );
    const rows = await res.json() as any[];

    if (!Array.isArray(rows) || rows.length === 0) {
      // Webhook may not have arrived yet — client will retry
      return new Response(JSON.stringify({ error: 'License not ready yet' }), { status: 202 });
    }

    return new Response(JSON.stringify(rows[0]), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const onRequestPost: PagesFunction = async () =>
  new Response('Method Not Allowed', { status: 405 });
