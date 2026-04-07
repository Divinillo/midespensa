// POST /api/play-verify-purchase
//
// Called by the Android TWA right after the user completes a Google Play
// Billing purchase via the Digital Goods API. The frontend sends us the
// purchaseToken + productId; we then:
//
//   1. Verify the caller is authenticated against Supabase (Bearer JWT).
//   2. Mint a Google service-account access token (signed JWT, OAuth2)
//      with the androidpublisher scope.
//   3. Call the Google Play Developer API
//      `purchases.subscriptionsv2.get` (falls back to v1 if v2 errors)
//      to confirm the token is real, was issued for our package, and is
//      currently in an "active"/"trialing" state.
//   4. Insert/update the corresponding row in the `licencias` table so
//      the user becomes Pro across all of their devices (web included).
//   5. Acknowledge the purchase via `purchases.subscriptions.acknowledge`
//      so Google does not auto-refund within 3 days.
//
// Required environment variables (Cloudflare Pages → Environment):
//   - SUPABASE_URL
//   - SUPABASE_SERVICE_KEY
//   - PLAY_PACKAGE_NAME             e.g. "app.midespensa.twa"
//   - GOOGLE_SERVICE_ACCOUNT_EMAIL  e.g. "play@my-proj.iam.gserviceaccount.com"
//   - GOOGLE_SERVICE_ACCOUNT_KEY    PEM-encoded private key (the "private_key"
//                                    field of the downloaded JSON, with literal
//                                    \n characters preserved as in the JSON file)
//
// Note: this file deliberately does NOT use any Node-only crypto libs so
// it runs unmodified inside Cloudflare Workers (Web Crypto only).

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  PLAY_PACKAGE_NAME: string;
  GOOGLE_SERVICE_ACCOUNT_EMAIL: string;
  GOOGLE_SERVICE_ACCOUNT_KEY: string;
}

const SCOPE = 'https://www.googleapis.com/auth/androidpublisher';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ── Web Crypto helpers ────────────────────────────────────────────────

function base64UrlEncode(bytes: ArrayBuffer | Uint8Array): string {
  const bin = String.fromCharCode(...new Uint8Array(bytes as ArrayBuffer));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const cleaned = pem
    .replace(/\\n/g, '\n')
    .replace(/-----BEGIN [^-]+-----/, '')
    .replace(/-----END [^-]+-----/, '')
    .replace(/\s+/g, '');
  const bin = atob(cleaned);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

async function signJwt(payload: object, privateKeyPem: string): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const enc = (obj: object) =>
    base64UrlEncode(new TextEncoder().encode(JSON.stringify(obj)));

  const headerEnc = enc(header);
  const payloadEnc = enc(payload);
  const signingInput = `${headerEnc}.${payloadEnc}`;

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(privateKeyPem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signingInput),
  );
  return `${signingInput}.${base64UrlEncode(sig)}`;
}

async function getGoogleAccessToken(env: Env): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const jwt = await signJwt(
    {
      iss: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    },
    env.GOOGLE_SERVICE_ACCOUNT_KEY,
  );

  const tokenRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!tokenRes.ok) {
    throw new Error(`Google OAuth failed: ${tokenRes.status} ${await tokenRes.text()}`);
  }
  const data = await tokenRes.json() as { access_token: string };
  return data.access_token;
}

// ── Subscription validation ───────────────────────────────────────────

interface SubscriptionState {
  active: boolean;
  expiryTimeMillis?: number;
  raw: any;
}

async function fetchSubscription(
  env: Env,
  accessToken: string,
  productId: string,
  purchaseToken: string,
): Promise<SubscriptionState> {
  // Try the v2 endpoint first (recommended), fall back to v1 if Google
  // returns 4xx (still happens in some regions).
  const v2Url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${env.PLAY_PACKAGE_NAME}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;
  const v2 = await fetch(v2Url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (v2.ok) {
    const data = await v2.json() as any;
    const state = (data.subscriptionState ?? '').toString();
    const active =
      state === 'SUBSCRIPTION_STATE_ACTIVE' ||
      state === 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD' ||
      state === 'SUBSCRIPTION_STATE_PAUSED';
    const lineItem = Array.isArray(data.lineItems) ? data.lineItems[0] : null;
    const expiry = lineItem?.expiryTime
      ? Date.parse(lineItem.expiryTime)
      : undefined;
    return { active, expiryTimeMillis: expiry, raw: data };
  }

  const v1Url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${env.PLAY_PACKAGE_NAME}/purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}`;
  const v1 = await fetch(v1Url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!v1.ok) {
    throw new Error(`Play subscription verify failed: ${v1.status} ${await v1.text()}`);
  }
  const data = await v1.json() as any;
  const expiry = Number(data.expiryTimeMillis ?? 0);
  // paymentState 1 = received, 2 = free trial; both count as active
  const active = expiry > Date.now() && (data.paymentState === 1 || data.paymentState === 2);
  return { active, expiryTimeMillis: expiry, raw: data };
}

async function acknowledgeSubscription(
  env: Env,
  accessToken: string,
  productId: string,
  purchaseToken: string,
): Promise<void> {
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${env.PLAY_PACKAGE_NAME}/purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`;
  await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  // Non-fatal: even if Google returns 409 (already acknowledged) we
  // proceed; the client also acknowledges from the DigitalGoodsService.
}

// ── Supabase helpers ──────────────────────────────────────────────────

function sbHeaders(env: Env) {
  return {
    'Content-Type': 'application/json',
    'apikey': env.SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
  };
}

async function upsertProLicense(
  env: Env,
  email: string,
  purchaseToken: string,
  productId: string,
  expiryMillis: number | undefined,
): Promise<void> {
  // Look for an existing licencia for this email
  const lookup = await fetch(
    `${env.SUPABASE_URL}/rest/v1/licencias?email=eq.${encodeURIComponent(email)}&select=id,clave&limit=1`,
    { headers: sbHeaders(env) },
  );
  const rows = await lookup.json() as Array<{ id: string; clave: string }>;

  const payload = {
    email,
    tier: 'pro' as const,
    activa: true,
    session_id: `play:${purchaseToken}`,
    play_product_id: productId,
    play_expiry: expiryMillis ? new Date(expiryMillis).toISOString() : null,
  };

  if (rows.length > 0) {
    await fetch(`${env.SUPABASE_URL}/rest/v1/licencias?id=eq.${rows[0].id}`, {
      method: 'PATCH',
      headers: { ...sbHeaders(env), 'Prefer': 'return=minimal' },
      body: JSON.stringify(payload),
    });
  } else {
    // Generate a license key just like Stripe webhook does so the row is consistent
    const arr = new Uint8Array(8);
    crypto.getRandomValues(arr);
    const clave = Array.from(arr)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
      .match(/.{4}/g)!
      .join('-');
    await fetch(`${env.SUPABASE_URL}/rest/v1/licencias`, {
      method: 'POST',
      headers: { ...sbHeaders(env), 'Prefer': 'return=minimal' },
      body: JSON.stringify({ ...payload, clave, created_at: new Date().toISOString() }),
    });
  }
}

// ── Handler ───────────────────────────────────────────────────────────

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  // 1) Authenticate caller via Supabase JWT
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return json({ error: 'Unauthorized' }, 401);

  const authRes = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { 'apikey': env.SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${token}` },
  });
  if (!authRes.ok) return json({ error: 'Unauthorized' }, 401);
  const authUser = await authRes.json() as { email?: string };
  if (!authUser.email) return json({ error: 'Unauthorized' }, 401);

  // 2) Parse purchase data
  let purchaseToken: string, productId: string;
  try {
    const body = await request.json() as { purchaseToken?: string; productId?: string };
    purchaseToken = (body.purchaseToken ?? '').trim();
    productId     = (body.productId ?? '').trim();
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }
  if (!purchaseToken || !productId) {
    return json({ error: 'Missing purchaseToken or productId' }, 400);
  }

  // 3) Verify with Google Play
  let accessToken: string;
  try {
    accessToken = await getGoogleAccessToken(env);
  } catch (err: any) {
    return json({ error: 'Play credentials misconfigured', detail: err?.message }, 500);
  }

  let state: SubscriptionState;
  try {
    state = await fetchSubscription(env, accessToken, productId, purchaseToken);
  } catch (err: any) {
    return json({ error: 'Play verification failed', detail: err?.message }, 502);
  }
  if (!state.active) {
    return json({ error: 'Subscription is not active', state: state.raw }, 402);
  }

  // 4) Upsert the user's Pro license in Supabase
  try {
    await upsertProLicense(env, authUser.email, purchaseToken, productId, state.expiryTimeMillis);
  } catch (err: any) {
    return json({ error: 'License upsert failed', detail: err?.message }, 500);
  }

  // 5) Acknowledge so Google does not refund automatically
  acknowledgeSubscription(env, accessToken, productId, purchaseToken).catch(() => undefined);

  return json({ ok: true, tier: 'pro', expiresAt: state.expiryTimeMillis ?? null });
};

export const onRequestGet: PagesFunction = async () =>
  new Response('Method Not Allowed', { status: 405 });
