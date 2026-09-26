// Server-side Gemini endpoint for the voice assistant.
// Receives a voice transcript + compact app state, returns structured
// actions to apply client-side plus a short spoken reply.

import { checkDailyRateLimit, rateLimitBlockedBody } from './_rateLimit';

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  GEMINI_KEY: string;
}

// Per-user daily budget. Client additionally enforces a free-tier
// monthly cap; this server cap protects the shared Gemini quota.
const ASSISTANT_DAILY_LIMIT = 20;

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
  const authUser = await authRes.json() as { email?: string };
  if (!authUser.email) return json({ error: 'Unauthorized' }, 401);

  // ── Per-user daily rate limit ────────────────────────────────
  const rl = await checkDailyRateLimit(env, authUser.email, 'gemini-assistant', ASSISTANT_DAILY_LIMIT);
  if (!rl.allowed) return json(rateLimitBlockedBody(rl, 'assistant'), 429);

  // ── Parse body ───────────────────────────────────────────────
  let transcript: string, lang: string, today: string;
  let ingredients: { name: string; available: boolean; needed: boolean }[];
  let dishes: string[], categories: string[];
  try {
    const body = await request.json() as any;
    transcript  = String(body.transcript ?? '').slice(0, 600);
    lang        = body.lang === 'en' ? 'en' : 'es';
    today       = /^\d{4}-\d{2}-\d{2}$/.test(body.today) ? body.today : new Date().toISOString().slice(0, 10);
    ingredients = Array.isArray(body.ingredients) ? body.ingredients.slice(0, 400) : [];
    dishes      = Array.isArray(body.dishes) ? body.dishes.slice(0, 150) : [];
    categories  = Array.isArray(body.categories) ? body.categories.slice(0, 30) : [];
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }

  if (!transcript.trim()) return json({ error: 'Empty transcript' }, 400);
  if (!env.GEMINI_KEY) return json({ error: 'AI not configured' }, 503);

  const pantryLines = ingredients
    .map(i => `${i.name} | ${i.available ? 'available' : 'not available'}${i.needed ? ' | on shopping list' : ''}`)
    .join('\n');

  const langNote = lang === 'en'
    ? 'The user speaks ENGLISH. Write "reply" in natural English.'
    : 'The user speaks SPANISH. Write "reply" in natural Spanish.';

  const prompt =
    `You are the voice assistant of MiDespensa, a pantry & meal-planning app. ` +
    `Interpret the user's spoken command and translate it into structured actions.\n\n` +
    `${langNote}\nTODAY is ${today}.\n\n` +
    `USER'S PANTRY (name | availability):\n${pantryLines || '(empty)'}\n\n` +
    `USER'S SAVED DISHES:\n${dishes.join('\n') || '(none)'}\n\n` +
    `VALID CATEGORIES: ${categories.join(', ') || 'Otros'}\n\n` +
    `USER SAID: "${transcript}"\n\n` +
    `Return ONLY valid JSON (no markdown) with this exact shape:\n` +
    `{"reply":"short spoken confirmation (max 2 sentences)","actions":[...]}\n\n` +
    `Allowed action objects:\n` +
    `- {"type":"add_ingredients","items":[{"name":"...","category":"one of the valid categories"}]} → user says they HAVE something (fridge/pantry/freezer). Mark as available. Use existing pantry names when the product already exists.\n` +
    `- {"type":"consume","names":["..."]} → user used up / finished / ran out of something: mark not available AND add to shopping list for the next purchase.\n` +
    `- {"type":"add_to_list","names":["..."]} → user wants to buy something (without saying they ran out).\n` +
    `- {"type":"remove_from_list","names":["..."]} → user already bought it or doesn't want it. Also mark it available if they bought it.\n` +
    `- {"type":"plan_week","menu":[{"date":"YYYY-MM-DD","lunch":"dish name","dinner":"dish name"}]} → user asks for a menu/meal plan. Build 7 days starting TODAY (or the range they ask). STRONGLY prefer the user's saved dishes that use available pantry ingredients; you may propose simple new dishes when needed.\n` +
  `- {"type":"add_dish","dishes":[{"name":"...","ingredients":["..."],"mealType":"lunch|dinner|both","steps":["step 1","step 2"]}]} → user asks to create/save a dish or recipe (e.g. "créame un plato de macarrones"). Invent a sensible simple recipe: 3-8 ingredients (reuse pantry names when possible), 3-6 short preparation steps in the user's language.\n\n` +
    `Rules:\n` +
    `- Ingredient names: singular, lowercase, in the user's language, no brands.\n` +
    `- If the command is a question about the pantry (e.g. "what do I have?", "what's missing?"), answer it in "reply" with actions:[] — summarize, don't list more than ~10 items.\n` +
    `- If the command is unclear or unrelated to the app, say so briefly in "reply" with actions:[].\n` +
    `- Never invent pantry state: rely on the list above.\n` +
    `- Combine multiple intents in one command into multiple actions.\n`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 2048, responseMimeType: 'application/json' },
  };

  let lastErr = '';
  for (const model of GEMINI_MODELS) {
    try {
      const res = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${env.GEMINI_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { lastErr = `${model}: ${res.status}`; continue; }
      const data = await res.json() as any;
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
      const parsed = JSON.parse(cleaned);
      if (typeof parsed?.reply !== 'string') { lastErr = `${model}: bad shape`; continue; }
      return json({
        reply: parsed.reply.slice(0, 400),
        actions: Array.isArray(parsed.actions) ? parsed.actions.slice(0, 12) : [],
      });
    } catch (e: any) {
      lastErr = `${model}: ${e?.message ?? 'error'}`;
    }
  }
  return json({ error: 'AI unavailable', detail: lastErr }, 502);
};
