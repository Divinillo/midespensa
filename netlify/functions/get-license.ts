import type { Handler } from '@netlify/functions';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') return { statusCode: 405, body: 'Method Not Allowed' };

  const session_id = event.queryStringParameters?.session_id;
  if (!session_id) return { statusCode: 400, body: JSON.stringify({ error: 'Missing session_id' }) };

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/licencias?session_id=eq.${encodeURIComponent(session_id)}&activa=eq.true&select=clave,email,tier&limit=1`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } },
    );
    const rows = await res.json();

    if (!Array.isArray(rows) || rows.length === 0) {
      // Webhook may not have arrived yet — client will retry
      return { statusCode: 202, body: JSON.stringify({ error: 'License not ready yet' }) };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rows[0]),
    };
  } catch (err: any) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
