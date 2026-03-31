interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
}

const RATE_LIMIT_MAX     = 10;  // max attempts
const RATE_LIMIT_WINDOW  = 15 * 60 * 1000; // 15 minutes (ms)

export const onRequestPost: PagesFunction<Env> = async (context) => {
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

  const verifiedEmail = authUser.email;

  const sbHeaders = {
    'Content-Type': 'application/json',
    'apikey': env.SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
  };

  // ── Rate limiting (per user email, 15-min sliding window) ──────
  const rlKey = `rl:val:${verifiedEmail}`;
  try {
    const rlRes = await fetch(
      `${env.SUPABASE_URL}/rest/v1/rate_limits?key=eq.${encodeURIComponent(rlKey)}&select=count,window_start&limit=1`,
      { headers: sbHeaders },
    );
    const rlRows = await rlRes.json() as Array<{ count: number; window_start: string }>;
    const now = Date.now();

    if (rlRows.length > 0) {
      const { count, window_start } = rlRows[0];
      const windowAge = now - new Date(window_start).getTime();

      if (windowAge < RATE_LIMIT_WINDOW && count >= RATE_LIMIT_MAX) {
        return json({ error: 'Too many requests. Please try again later.' }, 429);
      }

      if (windowAge >= RATE_LIMIT_WINDOW) {
        // Reset window
        await fetch(
          `${env.SUPABASE_URL}/rest/v1/rate_limits?key=eq.${encodeURIComponent(rlKey)}`,
          {
            method: 'PATCH',
            headers: { ...sbHeaders, 'Prefer': 'return=minimal' },
            body: JSON.stringify({ count: 1, window_start: new Date().toISOString() }),
          },
        );
      } else {
        // Increment
        await fetch(
          `${env.SUPABASE_URL}/rest/v1/rate_limits?key=eq.${encodeURIComponent(rlKey)}`,
          {
            method: 'PATCH',
            headers: { ...sbHeaders, 'Prefer': 'return=minimal' },
            body: JSON.stringify({ count: count + 1 }),
          },
        );
      }
    } else {
      // Create new entry
      await fetch(`${env.SUPABASE_URL}/rest/v1/rate_limits`, {
        method: 'POST',
        headers: { ...sbHeaders, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ key: rlKey, count: 1, window_start: new Date().toISOString() }),
      });
    }
  } catch {
    // Rate limit check failure is non-fatal — allow the request through
  }

  // ── Parse license key from body ────────────────────────────────
  let clave: string;
  try {
    const body = await request.json() as { clave?: string };
    clave = (body.clave ?? '').toUpperCase().trim();
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }

  if (clave.length < 8) return json({ error: 'Invalid license key' }, 400);

  try {
    // Look up the license key using the service key (bypasses RLS)
    const res = await fetch(
      `${env.SUPABASE_URL}/rest/v1/licencias?clave=eq.${encodeURIComponent(clave)}&activa=eq.true&select=id,tier,email&limit=1`,
      { headers: sbHeaders },
    );
    const rows = await res.json() as any[];

    if (!Array.isArray(rows) || rows.length === 0) {
      return json({ valid: false }, 200);
    }

    const { id, tier } = rows[0];

    // Link the license to this user's email if not already linked
    await fetch(`${env.SUPABASE_URL}/rest/v1/licencias?id=eq.${id}`, {
      method: 'PATCH',
      headers: { ...sbHeaders, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ email: verifiedEmail }),
    });

    return json({ valid: true, tier });
  } catch {
    return json({ error: 'Internal server error' }, 500);
  }
};

export const onRequestGet: PagesFunction = async () =>
  new Response('Method Not Allowed', { status: 405 });

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
