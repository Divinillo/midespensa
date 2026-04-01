interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
}

const TRIAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const onRequest: PagesFunction<Env> = async (context) => {
  try {
    const { request, env } = context;

    // ── JWT verification ───────────────────────────────────────────
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return json({ error: 'Unauthorized' }, 401);

    const authRes = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!authRes.ok) return json({ error: 'Unauthorized' }, 401);
    const authUser = await authRes.json() as { email?: string };
    if (!authUser.email) return json({ error: 'Unauthorized' }, 401);

    // Use the verified email from JWT — never trust client-supplied email
    const verifiedEmail = authUser.email;

    const sbHeaders = {
      'Content-Type': 'application/json',
      'apikey': env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    };

    // ── POST: save data ───────────────────────────────────────────
    if (request.method === 'POST') {
      const appData = await request.json() as any;
      const { email: _ignored, ...rest } = appData; // ignore client-supplied email

      // Fetch existing record to preserve server-side trial_end (client cannot set it)
      const existingRes = await fetch(
        `${env.SUPABASE_URL}/rest/v1/despensa_data?email=eq.${encodeURIComponent(verifiedEmail)}&select=data&limit=1`,
        { headers: sbHeaders }
      );
      const existingRows = await existingRes.json() as any[];
      const existingTrialEnd = existingRows[0]?.data?.trial_end as number | undefined;

      // New user: assign trial_end = now + 7 days. Existing user: preserve original value.
      const trialEnd = existingTrialEnd ?? (Date.now() + TRIAL_MS);

      // Always strip client-supplied trial_end and replace with server value
      const { trial_end: _clientTrialEnd, ...restClean } = rest;
      const dataToSave = { ...restClean, trial_end: trialEnd };

      const res = await fetch(`${env.SUPABASE_URL}/rest/v1/despensa_data`, {
        method: 'POST',
        headers: { ...sbHeaders, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ email: verifiedEmail, data: dataToSave, updated_at: dataToSave.updated_at ?? Date.now() }),
      });

      if (!res.ok) return json({ error: 'Save failed' }, 500);
      return json({ ok: true });
    }

    // ── GET: load data + tier ─────────────────────────────────────
    if (request.method === 'GET') {
      const url     = new URL(request.url);
      const pinHash = url.searchParams.get('pin_hash');
      const email   = verifiedEmail;

      const [dataRes, licRes] = await Promise.all([
        fetch(`${env.SUPABASE_URL}/rest/v1/despensa_data?email=eq.${encodeURIComponent(email)}&select=data,updated_at&limit=1`, { headers: sbHeaders }),
        fetch(`${env.SUPABASE_URL}/rest/v1/licencias?email=eq.${encodeURIComponent(email)}&activa=eq.true&select=tier&limit=1`, { headers: sbHeaders }),
      ]);

      const dataRows = await dataRes.json() as any[];
      const licRows  = await licRes.json() as any[];

      if (!Array.isArray(dataRows) || dataRows.length === 0) {
        return json({ error: 'No data found' }, 404);
      }

      const { data: storedData, updated_at } = dataRows[0];

      // ── Verificación de PIN ──
      const storedPinHash = storedData?.recovery_pin_hash;
      if (storedPinHash) {
        if (!pinHash) return json({ error: 'PIN_REQUIRED' }, 401);
        if (pinHash !== storedPinHash) return json({ error: 'PIN_INVALID' }, 403);
      }

      // ── Tier resolution ──
      // Priority: active paid license > active trial > free
      const hasPaidLicense = Array.isArray(licRows) && licRows[0]?.tier && licRows[0]?.activa !== false;
      const trialEnd = storedData?.trial_end as number | undefined;
      const isTrialActive = trialEnd ? Date.now() < trialEnd : false;

      let tier: string | null = null;
      if (hasPaidLicense) {
        tier = 'pro';
      } else if (isTrialActive) {
        tier = 'trial';
      }

      return json({ ...storedData, updated_at, tier });
    }

    return new Response('Method Not Allowed', { status: 405 });
  } catch (_err: any) {
    // Never expose internal error details or stack traces
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
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
