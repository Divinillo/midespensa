// POST /api/play-billing-webhook
//
// Receiver for Google Play Real-time Developer Notifications (RTDN). Google
// Pub/Sub pushes notifications here whenever a subscription changes state
// (renewal, cancellation, refund, hold, recovery, expiration, etc.).
//
// Body shape (Pub/Sub push):
// {
//   "message": {
//     "data": "<base64 JSON developerNotification>",
//     "messageId": "...",
//     "publishTime": "..."
//   },
//   "subscription": "projects/<proj>/subscriptions/<sub>"
// }
//
// developerNotification (decoded JSON):
// {
//   "version": "1.0",
//   "packageName": "app.midespensa.twa",
//   "eventTimeMillis": "...",
//   "subscriptionNotification": {
//     "version": "1.0",
//     "notificationType": <int>,
//     "purchaseToken": "...",
//     "subscriptionId": "pro_monthly"
//   }
// }
//
// notificationType values we care about:
//   1  = SUBSCRIPTION_RECOVERED          → activate
//   2  = SUBSCRIPTION_RENEWED            → activate
//   3  = SUBSCRIPTION_CANCELED           → keep until expiry
//   4  = SUBSCRIPTION_PURCHASED          → activate (also handled by verify endpoint)
//   5  = SUBSCRIPTION_ON_HOLD            → suspend
//   6  = SUBSCRIPTION_IN_GRACE_PERIOD    → keep active
//   7  = SUBSCRIPTION_RESTARTED          → activate
//   8  = SUBSCRIPTION_PRICE_CHANGE_CONFIRMED → no-op
//   9  = SUBSCRIPTION_DEFERRED           → no-op
//   10 = SUBSCRIPTION_PAUSED             → suspend
//   11 = SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED → no-op
//   12 = SUBSCRIPTION_REVOKED            → suspend (refunded)
//   13 = SUBSCRIPTION_EXPIRED            → suspend
//
// We do NOT verify the user identity here — Google's signed Pub/Sub push is
// the source of truth and we look up the licencia row by purchaseToken
// (stored as `session_id = "play:<token>"` by play-verify-purchase.ts).
//
// To restrict access, configure the Pub/Sub push subscription with a
// shared secret in the URL query string (e.g. ?key=XXX) and check it here.

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  PLAY_RTDN_SHARED_SECRET?: string;
}

const SUSPEND = new Set([5, 10, 12, 13]);
const ACTIVATE = new Set([1, 2, 4, 6, 7]);

function sbHeaders(env: Env) {
  return {
    'Content-Type': 'application/json',
    'apikey': env.SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
  };
}

async function setLicenseActiveByPlayToken(
  env: Env,
  purchaseToken: string,
  active: boolean,
): Promise<void> {
  const sessionId = `play:${purchaseToken}`;
  await fetch(
    `${env.SUPABASE_URL}/rest/v1/licencias?session_id=eq.${encodeURIComponent(sessionId)}`,
    {
      method: 'PATCH',
      headers: { ...sbHeaders(env), 'Prefer': 'return=minimal' },
      body: JSON.stringify({ activa: active }),
    },
  );
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  // Optional shared-secret check (configured on the Pub/Sub push subscription)
  if (env.PLAY_RTDN_SHARED_SECRET) {
    const url = new URL(request.url);
    if (url.searchParams.get('key') !== env.PLAY_RTDN_SHARED_SECRET) {
      return new Response('Forbidden', { status: 403 });
    }
  }

  let push: any;
  try {
    push = await request.json();
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  const dataB64 = push?.message?.data;
  if (!dataB64) {
    // Pub/Sub also sends test pings without data — return 200 so it
    // doesn't get retried forever.
    return new Response('OK', { status: 200 });
  }

  let notification: any;
  try {
    const decoded = atob(dataB64);
    notification = JSON.parse(decoded);
  } catch {
    return new Response('OK', { status: 200 });
  }

  const sn = notification?.subscriptionNotification;
  if (!sn) {
    // Could be a one-time productNotification or a test message; ignore.
    return new Response('OK', { status: 200 });
  }

  const purchaseToken: string = sn.purchaseToken ?? '';
  const notificationType: number = sn.notificationType ?? 0;
  if (!purchaseToken || !notificationType) {
    return new Response('OK', { status: 200 });
  }

  try {
    if (ACTIVATE.has(notificationType)) {
      await setLicenseActiveByPlayToken(env, purchaseToken, true);
    } else if (SUSPEND.has(notificationType)) {
      await setLicenseActiveByPlayToken(env, purchaseToken, false);
    }
    // Other types (3 cancel, 8/9/11 no-op) are intentionally not handled:
    // - cancel: subscription stays active until expiry, RTDN will send
    //   SUBSCRIPTION_EXPIRED when the time comes.
  } catch {
    // Always 200 so Pub/Sub doesn't hammer us with retries on transient
    // failures; we'll catch missed events on the next user login when
    // the play-verify-purchase endpoint runs.
  }

  return new Response('OK', { status: 200 });
};

export const onRequestGet: PagesFunction = async () =>
  new Response('Method Not Allowed', { status: 405 });
