interface Env {
  ANTHROPIC_API_KEY: string;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!env.ANTHROPIC_API_KEY) return json({ error: 'API key not configured' }, 500);

  let name: string;
  let ings: string[];
  try {
    const body = await request.json() as { name: string; ings: string[] };
    name = body.name;
    ings = body.ings ?? [];
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  if (!name) return json({ error: 'Missing recipe name' }, 400);

  const prompt = `Eres un chef profesional español. Explica cómo preparar "${name}" con estos ingredientes: ${ings.join(', ')}.

Responde SOLO con un JSON con este formato exacto (sin texto extra):
{
  "tiempo": "XX min",
  "dificultad": "Fácil|Media|Difícil",
  "pasos": [
    "Paso 1 en una frase corta y clara.",
    "Paso 2 en una frase corta y clara.",
    "Paso 3...",
    "Paso 4...",
    "Paso 5..."
  ],
  "consejo": "Un consejo breve del chef."
}

Máximo 6 pasos. Cada paso: 1 frase directa, en español de España.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return json({ error: `Claude API error: ${err}` }, 500);
    }

    const data = await res.json() as any;
    const text = data?.content?.[0]?.text ?? '';

    // Parse the JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return json({ error: 'Invalid response format' }, 500);

    const recipe = JSON.parse(jsonMatch[0]);
    return json({ ok: true, recipe });
  } catch (e: any) {
    return json({ error: e?.message ?? 'Unknown error' }, 500);
  }
};
