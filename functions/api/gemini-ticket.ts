// Server-side Gemini endpoint for ticket parsing (PDF text and image OCR).
// The GEMINI_KEY never reaches the client bundle.

import { checkDailyRateLimit, rateLimitBlockedBody } from './_rateLimit';

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  GEMINI_KEY: string;
}

// Max Gemini ticket parses per user per 24h. Protects the free-tier Gemini
// quota from single-user abuse. Adjust here if needed.
const TICKET_DAILY_LIMIT = 5;

interface TicketProduct {
  name: string;
  price: number;
}
interface GeminiTicketResult {
  date: string | null;
  total: number | null;
  products: TicketProduct[];
}

const GEMINI_BASE   = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_MODELS = [
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash',
];

const PROMPT_TEXT =
  `Analiza este texto de un ticket de supermercado español y extrae todos los productos comprados.\n` +
  `Devuelve ÚNICAMENTE JSON válido con este formato exacto (sin texto adicional):\n` +
  `{"date":"YYYY-MM-DD","total":0.00,"products":[{"name":"nombre","price":0.00}]}\n` +
  `Reglas:\n` +
  `- date: fecha en formato YYYY-MM-DD, null si no aparece\n` +
  `- total: importe total pagado, null si no aparece\n` +
  `- products: SOLO artículos físicos (comida, bebida, higiene, hogar). Excluye bolsas, descuentos, vales, comisiones, IVA, cambio, líneas de total o subtotal.\n` +
  `- price: precio final pagado por ese artículo (para productos por peso, el importe total de esa línea)\n` +
  `- name: nombre limpio del producto en español, sin códigos ni cantidades\n` +
  `TEXTO DEL TICKET:`;

const PROMPT_IMAGE =
  `Desglosa ingrediente por ingrediente su importe y la suma del total de este ticket de supermercado.\n` +
  `Devuelve ÚNICAMENTE JSON válido con este formato exacto (sin texto adicional, sin markdown):\n` +
  `{"date":"YYYY-MM-DD","total":0.00,"products":[{"name":"nombre","price":0.00}]}\n` +
  `- date: fecha del ticket en formato YYYY-MM-DD, null si no aparece\n` +
  `- total: importe total final pagado\n` +
  `- products: cada línea de producto con su importe final (si hay descuento aplicado, usa el precio ya descontado). Incluye todos los artículos sin excepción.\n` +
  `- name: nombre del producto en minúsculas, limpio, sin códigos`;

async function callGemini(
  key: string,
  parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }>,
): Promise<GeminiTicketResult | null> {
  for (const model of GEMINI_MODELS) {
    try {
      const url = `${GEMINI_BASE}/${model}:generateContent?key=${key}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { temperature: 0, maxOutputTokens: 8192 },
        }),
      });
      if (res.status === 429) continue; // quota — try next model
      if (!res.ok) continue;
      const data = await res.json() as { candidates?: { content: { parts: { text: string }[] } }[] };
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      if (!rawText) continue;
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;
      const parsed = JSON.parse(jsonMatch[0]) as { date?: string; total?: number; products?: TicketProduct[] };
      const products = (parsed.products ?? []).filter(
        p => p.name && typeof p.price === 'number' && p.price > 0 && p.price < 1000,
      );
      return { products, total: parsed.total ?? null, date: parsed.date ?? null };
    } catch { /* try next */ }
  }
  return null;
}

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
  const authUser = await authRes.json() as { email?: string };
  if (!authUser.email) return json({ error: 'Unauthorized' }, 401);

  // ── Per-user daily rate limit (protects Gemini free-tier quota) ──
  const rl = await checkDailyRateLimit(env, authUser.email, 'gemini-ticket', TICKET_DAILY_LIMIT);
  if (!rl.allowed) return json(rateLimitBlockedBody(rl, 'ticket'), 429);

  // ── Parse body ───────────────────────────────────────────────
  let mode: string, rows: string[], base64: string, mimeType: string;
  try {
    const body = await request.json() as {
      mode?: string;
      rows?: string[];
      base64?: string;
      mimeType?: string;
    };
    mode     = body.mode ?? '';
    rows     = Array.isArray(body.rows) ? body.rows : [];
    base64   = typeof body.base64   === 'string' ? body.base64   : '';
    mimeType = typeof body.mimeType === 'string' ? body.mimeType : 'image/jpeg';
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }

  if (!env.GEMINI_KEY) return json({ error: 'AI not configured' }, 503);

  let result: GeminiTicketResult | null = null;

  if (mode === 'text') {
    if (!rows.length) return json({ error: 'No rows provided' }, 400);
    result = await callGemini(env.GEMINI_KEY, [{ text: PROMPT_TEXT + '\n' + rows.join('\n') }]);
  } else if (mode === 'image') {
    if (!base64) return json({ error: 'No image data provided' }, 400);
    result = await callGemini(env.GEMINI_KEY, [
      { text: PROMPT_IMAGE },
      { inline_data: { mime_type: mimeType, data: base64 } },
    ]);
  } else {
    return json({ error: 'Invalid mode' }, 400);
  }

  if (!result) return json({ error: 'AI parsing failed' }, 502);
  return json(result);
};

export const onRequestGet: PagesFunction = async () =>
  new Response('Method Not Allowed', { status: 405 });
