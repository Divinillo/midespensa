interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
}

// ── Promo window: rewards grant Pro days only until this date ──
// After PROMO_END, trophies/badges still track but no days are granted.
const PROMO_END = Date.parse('2026-08-31T23:59:59Z');

const DAY_MS = 24 * 60 * 60 * 1000;
const REVIEW_REWARD_DAYS = 7;   // leave a Play Store review → +7 days
const FIRST_SHARE_DAYS   = 7;   // first share → +7 days
const FIVE_SHARES_DAYS   = 5;   // reach 5 shares → +5 days
const REFERRAL_DAYS      = 1;   // each new user who signs up with your code → +1 day

interface PromoState {
  ref_code?: string;
  shares?: number;
  referrals?: number;
  review_claimed?: boolean;
  first_share_claimed?: boolean;
  five_shares_claimed?: boolean;
  referred_by?: string;
}

/** Deterministic 8-char referral code from email (uppercase, no confusing chars). */
async function makeRefCode(email: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('midespensa-ref:' + email.toLowerCase().trim()));
  const bytes = new Uint8Array(buf);
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += alphabet[bytes[i] % alphabet.length];
  return code;
}

/** Extend trial_end by N days (from now if already expired). */
function extendTrial(data: any, days: number): any {
  const now = Date.now();
  const current = typeof data.trial_end === 'number' ? data.trial_end : now;
  const base = Math.max(now, current);
  return { ...data, trial_end: base + days * DAY_MS };
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { request, env } = context;

    // ── JWT verification ──
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return json({ error: 'Unauthorized' }, 401);

    const authRes = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: { 'apikey': env.SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${token}` },
    });
    if (!authRes.ok) return json({ error: 'Unauthorized' }, 401);
    const authUser = await authRes.json() as { email?: string };
    if (!authUser.email) return json({ error: 'Unauthorized' }, 401);
    const email = authUser.email;

    const sbHeaders = {
      'Content-Type': 'application/json',
      'apikey': env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    };

    const body = await request.json() as { action?: string; code?: string };
    const action = body.action;
    if (!action || !['get', 'share', 'review', 'redeem_referral'].includes(action)) {
      return json({ error: 'Invalid action' }, 400);
    }

    // ── Load own record ──
    const rowRes = await fetch(
      `${env.SUPABASE_URL}/rest/v1/despensa_data?email=eq.${encodeURIComponent(email)}&select=data&limit=1`,
      { headers: sbHeaders },
    );
    const rows = await rowRes.json() as any[];
    if (!Array.isArray(rows) || rows.length === 0) return json({ error: 'No data found' }, 404);

    let data = rows[0].data ?? {};
    let promo: PromoState = data.promo ?? {};
    const promoActive = Date.now() < PROMO_END;
    let granted = 0;

    // Ensure ref code exists
    if (!promo.ref_code) promo.ref_code = await makeRefCode(email);

    if (action === 'share') {
      promo.shares = (promo.shares ?? 0) + 1;
      if (promoActive) {
        if (promo.shares >= 1 && !promo.first_share_claimed) {
          promo.first_share_claimed = true;
          granted += FIRST_SHARE_DAYS;
        }
        if (promo.shares >= 5 && !promo.five_shares_claimed) {
          promo.five_shares_claimed = true;
          granted += FIVE_SHARES_DAYS;
        }
      }
    }

    if (action === 'review') {
      if (promo.review_claimed) return json({ error: 'Already claimed', promo: publicPromo(promo), promo_active: promoActive }, 409);
      promo.review_claimed = true;
      if (promoActive) granted += REVIEW_REWARD_DAYS;
    }

    if (action === 'redeem_referral') {
      const code = (body.code ?? '').toUpperCase().trim();
      if (!/^[A-Z2-9]{8}$/.test(code)) return json({ error: 'Invalid code' }, 400);
      if (promo.referred_by) return json({ error: 'Already redeemed', promo: publicPromo(promo), promo_active: promoActive }, 409);
      if (code === promo.ref_code) return json({ error: 'Own code' }, 400);

      // Find referrer by code (JSON path query)
      const refRes = await fetch(
        `${env.SUPABASE_URL}/rest/v1/despensa_data?data->promo->>ref_code=eq.${encodeURIComponent(code)}&select=email,data&limit=1`,
        { headers: sbHeaders },
      );
      const refRows = await refRes.json() as any[];
      if (!Array.isArray(refRows) || refRows.length === 0) return json({ error: 'Code not found' }, 404);

      const referrer = refRows[0];
      let refData = referrer.data ?? {};
      const refPromo: PromoState = refData.promo ?? {};
      refPromo.referrals = (refPromo.referrals ?? 0) + 1;
      refData.promo = refPromo;
      if (promoActive) refData = extendTrial(refData, REFERRAL_DAYS);

      // Save referrer
      await fetch(`${env.SUPABASE_URL}/rest/v1/despensa_data?email=eq.${encodeURIComponent(referrer.email)}`, {
        method: 'PATCH',
        headers: { ...sbHeaders, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ data: refData }),
      });

      promo.referred_by = code;
    }

    // Apply granted days + save own record
    data.promo = promo;
    if (granted > 0) data = extendTrial(data, granted);

    await fetch(`${env.SUPABASE_URL}/rest/v1/despensa_data?email=eq.${encodeURIComponent(email)}`, {
      method: 'PATCH',
      headers: { ...sbHeaders, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ data }),
    });

    return json({
      ok: true,
      promo: publicPromo(promo),
      granted_days: granted,
      trial_end: data.trial_end ?? null,
      promo_active: promoActive,
    });
  } catch {
    return json({ error: 'Internal server error' }, 500);
  }
};

function publicPromo(p: PromoState) {
  return {
    ref_code: p.ref_code,
    shares: p.shares ?? 0,
    referrals: p.referrals ?? 0,
    review_claimed: !!p.review_claimed,
  };
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const onRequestGet: PagesFunction = async () =>
  new Response('Method Not Allowed', { status: 405 });
