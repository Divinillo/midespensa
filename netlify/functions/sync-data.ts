import type { Handler } from '@netlify/functions';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;

const SB_HEADERS = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
};

export const handler: Handler = async (event) => {
  // ── POST: save data ───────────────────────────────────────────
  if (event.httpMethod === 'POST') {
    const { email, ...appData } = JSON.parse(event.body || '{}');
    if (!email) return { statusCode: 400, body: JSON.stringify({ error: 'Missing email' }) };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/despensa_data`, {
      method: 'POST',
      headers: { ...SB_HEADERS, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ email, data: appData, updated_at: appData.updated_at ?? Date.now() }),
    });

    if (!res.ok) return { statusCode: 500, body: JSON.stringify({ error: await res.text() }) };
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }

  // ── GET: load data + tier ─────────────────────────────────────
  if (event.httpMethod === 'GET') {
    const email = event.queryStringParameters?.email;
    if (!email) return { statusCode: 400, body: JSON.stringify({ error: 'Missing email' }) };

    const [dataRes, licRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/despensa_data?email=eq.${encodeURIComponent(email)}&select=data,updated_at&limit=1`, { headers: SB_HEADERS }),
      fetch(`${SUPABASE_URL}/rest/v1/licencias?email=eq.${encodeURIComponent(email)}&activa=eq.true&select=tier&limit=1`, { headers: SB_HEADERS }),
    ]);

    const dataRows = await dataRes.json();
    const licRows  = await licRes.json();

    if (!Array.isArray(dataRows) || dataRows.length === 0) {
      return { statusCode: 404, body: JSON.stringify({ error: 'No data found' }) };
    }

    const { data: appData, updated_at } = dataRows[0];
    const tier = Array.isArray(licRows) && licRows[0]?.tier ? licRows[0].tier : null;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...appData, updated_at, tier }),
    };
  }

  return { statusCode: 405, body: 'Method Not Allowed' };
};
