// Server-side Gemini endpoint for AI-powered ingredient matching.
// Receives unmatched product names + catalog names, returns best matches.
// Only matches with ≥90% confidence are returned; the rest stay undefined.

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  GEMINI_KEY: string;
}

const GEMINI_BASE   = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_MODELS = [
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash',
];

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  // ── JWT verification ─────────────────────────────────────────
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return json({ error: 'Unauthorized' }, 401);

  const authRes = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { 'apikey': env.SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${token}` },
  });
  if (!authRes.ok) return json({ error: 'Unauthorized' }, 401);

  // ── Parse body ───────────────────────────────────────────────
  let unmatched: string[], catalog: string[], market: string;
  try {
    const body = await request.json() as {
      unmatched?: string[];
      catalog?: string[];
      market?: string;
    };
    unmatched = Array.isArray(body.unmatched) ? body.unmatched.slice(0, 50) : [];
    catalog   = Array.isArray(body.catalog)   ? body.catalog              : [];
    market    = body.market === 'us' ? 'us' : 'es';
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }

  if (!unmatched.length || !catalog.length) return json({ matches: {} });
  if (!env.GEMINI_KEY) return json({ error: 'AI not configured' }, 503);

  const langNote = market === 'us'
    ? 'The products come from a US grocery store receipt (Walmart, Target, Kroger, etc). The catalog is in English.'
    : 'The products come from a Spanish supermarket receipt (Mercadona, Consum, Lidl, etc). The catalog is in Spanish.';

  const prompt =
    `You are a grocery product matcher. Given a list of product names from a store receipt, match each to the CLOSEST ingredient in the provided catalog.\n\n` +
    `${langNote}\n\n` +
    `CATALOG (one per line):\n${catalog.join('\n')}\n\n` +
    `UNMATCHED PRODUCTS (one per line):\n${unmatched.join('\n')}\n\n` +
    `Return ONLY valid JSON with this exact format (no markdown, no extra text):\n` +
    `{"matches":{"product name":"catalog name or null"}}\n\n` +
    `Rules:\n` +
    `- Match each product to the single best catalog ingredient\n` +
    `- Product names from receipts may have abbreviations, brand names, or extra text (e.g. "GV WHOLE MILK" → "whole milk", "BNSLS SKNLS CHKN BRST" → "chicken breast")\n` +
    `- Only match if you are ≥90% confident the product IS that ingredient\n` +
    `- If confidence is <90% or the product is NOT food (bags, cleaning supplies, tax, discounts), return null for that product\n` +
    `- The match value must be EXACTLY as it appears in the catalog (case-sensitive)\n` +
    `- Non-food items (bags, cleaning products, paper, etc.) must always be null`;

  for (const model of GEMINI_MODELS) {
    try {
      const url = `${GEMINI_BASE}/${model}:generateContent?key=${env.GEMINI_KEY}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 4096 },
        }),
      });
      if (res.status === 429) continue;
      if (!res.ok) continue;
      const data = await res.json() as any;
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      if (!rawText) continue;
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;
      const parsed = JSON.parse(jsonMatch[0]) as { matches?: Record<string, string | null> };
      // Validate: every value must be null or exist in catalog
      const catalogSet = new Set(catalog);
      const validated: Record<string, string | null> = {};
      for (const [prod, match] of Object.entries(parsed.matches ?? {})) {
        validated[prod] = (match && catalogSet.has(match)) ? match : null;
      }
      return json({ matches: validated });
    } catch { /* try next model */ }
  }

  return json({ matches: {} });
};

export const onRequestGet: PagesFunction = async () =>
  new Response('Method Not Allowed', { status: 405 });
