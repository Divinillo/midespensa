interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  GEMINI_KEY: string;
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
    headers: {
      'apikey': env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!authRes.ok) return json({ error: 'Unauthorized' }, 401);
  const authUser = await authRes.json() as { email?: string };
  if (!authUser.email) return json({ error: 'Unauthorized' }, 401);

  // ── Parse body ───────────────────────────────────────────────
  let availIngs: string[], recipeNames: string[], qty: number, diet: string;
  try {
    const body = await request.json() as {
      availIngs?: string[];
      recipeNames?: string[];
      qty?: number;
      diet?: string;
    };
    availIngs   = Array.isArray(body.availIngs)   ? body.availIngs   : [];
    recipeNames = Array.isArray(body.recipeNames)  ? body.recipeNames : [];
    qty         = typeof body.qty === 'number'      ? body.qty         : 3;
    diet        = typeof body.diet === 'string'     ? body.diet        : 'omnivora';
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }

  if (!recipeNames.length) return json({ names: [] });

  // ── Build prompt ─────────────────────────────────────────────
  const dietStr = diet !== 'omnivora' ? `Solo recetas de tipo "${diet}". ` : '';
  const prompt =
    `Ingredientes disponibles: ${availIngs.slice(0, 50).join(', ')}.\n` +
    `${dietStr}` +
    `De estas recetas: ${recipeNames.slice(0, 80).join(' | ')}.\n` +
    `Selecciona las ${qty} más adecuadas que pueda preparar principalmente con lo que tengo, ` +
    `priorizando las que necesiten menos ingredientes extra.\n` +
    `Devuelve ÚNICAMENTE un array JSON con los nombres exactos tal como aparecen: ["Nombre1","Nombre2"]`;

  // ── Call Gemini (server-side — key never reaches the client) ─
  for (const model of ['gemini-2.5-flash-lite', 'gemini-2.5-flash']) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0, maxOutputTokens: 512 },
          }),
        },
      );
      const d = await r.json() as {
        error?: { code: number };
        candidates?: { content: { parts: { text: string }[] } }[];
      };
      if (d.error?.code === 429) continue;
      const raw = d.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      const m = raw.match(/\[[\s\S]*\]/);
      if (m) {
        const names = JSON.parse(m[0]);
        if (Array.isArray(names) && names.length) return json({ names });
      }
    } catch { /* try next model */ }
  }

  return json({ names: [] });
};

export const onRequestGet: PagesFunction = async () =>
  new Response('Method Not Allowed', { status: 405 });
