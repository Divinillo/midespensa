interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  try {
  const { request, env } = context;

  const sbHeaders = {
    'Content-Type': 'application/json',
    'apikey': env.SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
  };

  // ── POST: save data ───────────────────────────────────────────
  if (request.method === 'POST') {
    const { email, ...appData } = await request.json() as any;
    if (!email) return json({ error: 'Missing email' }, 400);

    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/despensa_data`, {
      method: 'POST',
      headers: { ...sbHeaders, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ email, data: appData, updated_at: appData.updated_at ?? Date.now() }),
    });

    if (!res.ok) return json({ error: await res.text() }, 500);
    return json({ ok: true });
  }

  // ── GET: load data + tier ─────────────────────────────────────
  if (request.method === 'GET') {
    const url      = new URL(request.url);
    const email    = url.searchParams.get('email');
    const pinHash  = url.searchParams.get('pin_hash');
    if (!email) return json({ error: 'Missing email' }, 400);

    const [dataRes, licRes] = await Promise.all([
      fetch(`${env.SUPABASE_URL}/rest/v1/despensa_data?email=eq.${encodeURIComponent(email)}&select=data,updated_at&limit=1`, { headers: sbHeaders }),
      fetch(`${env.SUPABASE_URL}/rest/v1/licencias?email=eq.${encodeURIComponent(email)}&activa=eq.true&select=tier&limit=1`, { headers: sbHeaders }),
    ]);

    const dataRows = await dataRes.json() as any[];
    const licRows  = await licRes.json() as any[];

    if (!Array.isArray(dataRows) || dataRows.length === 0) {
      return json({ error: 'No data found' }, 404);
    }

    const { data: appData, updated_at } = dataRows[0];

    // ── Verificación de PIN ──
    const storedPinHash = appData?.recovery_pin_hash;
    if (storedPinHash) {
      if (!pinHash) return json({ error: 'PIN_REQUIRED' }, 401);
      if (pinHash !== storedPinHash) return json({ error: 'PIN_INVALID' }, 403);
    }

    const tier = Array.isArray(licRows) && licRows[0]?.tier ? licRows[0].tier : null;
    return json({ ...appData, updated_at, tier });
  }

  return new Response('Method Not Allowed', { status: 405 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Worker exception', detail: err?.message, stack: err?.stack }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
