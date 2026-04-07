// Client-side helper around the Digital Goods API + PaymentRequest API
// that lets a Trusted Web Activity launch Google Play Billing for a
// subscription purchase. The flow:
//
//   1. Resolve the DigitalGoodsService for `https://play.google.com/billing`.
//   2. Look up the SKU details (price, currency) — purely informational so
//      we can show the actual locale price returned by the Play Store and
//      not whatever we have hardcoded on the client.
//   3. Build a PaymentRequest pointing to that SKU and call .show() to
//      launch the native Play Billing sheet.
//   4. On success, call .complete('success') and POST the purchase token
//      to our backend (`/api/play-verify-purchase`) which validates it
//      against the Google Play Developer API and flips the user's tier
//      to Pro in Supabase.
//   5. Acknowledge the purchase via the DigitalGoodsService so Google
//      stops re-charging the user (mandatory within 3 days).
//
// We swallow `AbortError` (the user closed the sheet) but surface every
// other error to the caller so the UI can show a clear failure state.

import { supabase } from './supabase';

// SKU IDs configured in Google Play Console → Subscriptions.
// Keep these in sync with the products created server-side; the backend
// validates the productId so a typo here is caught.
export const PLAY_SKU_PRO_MONTHLY = 'pro_monthly';

export interface PlayPurchaseResult {
  ok: true;
  purchaseToken: string;
  productId: string;
}
export interface PlayPurchaseFailure {
  ok: false;
  reason: 'cancelled' | 'unsupported' | 'verify_failed' | 'unknown';
  message?: string;
}
export type PlayPurchaseOutcome = PlayPurchaseResult | PlayPurchaseFailure;

/** True if the running browser exposes the Digital Goods API (TWA + Play Billing). */
export function isPlayBillingAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof (window as any).getDigitalGoodsService === 'function' &&
    typeof (window as any).PaymentRequest === 'function'
  );
}

/**
 * Launch the Google Play Billing sheet for the given SKU and, on success,
 * verify the purchase server-side. The user's Supabase tier is updated by
 * the backend; this helper just returns the outcome so the UI can react.
 */
export async function buyWithPlayBilling(
  sku: string = PLAY_SKU_PRO_MONTHLY,
): Promise<PlayPurchaseOutcome> {
  if (!isPlayBillingAvailable()) {
    return { ok: false, reason: 'unsupported', message: 'Play Billing not available in this context' };
  }

  try {
    const service = await (window as any).getDigitalGoodsService(
      'https://play.google.com/billing',
    );

    // Pre-fetch SKU details so we can fail fast with a clearer error if the
    // SKU isn't published in Play Console yet (a very common config bug).
    const details = await service.getDetails([sku]);
    if (!details || details.length === 0) {
      return { ok: false, reason: 'unsupported', message: `SKU "${sku}" not found in Play Console` };
    }

    const request = new (window as any).PaymentRequest(
      [
        {
          supportedMethods: 'https://play.google.com/billing',
          data: { sku },
        },
      ],
      {
        // PaymentRequest demands a `total` even though Play Billing ignores
        // it (the real price comes from the Play Console SKU). We pass a
        // placeholder so the call validates.
        total: {
          label: 'MiDespensa Pro',
          amount: { currency: details[0].price?.currency ?? 'EUR', value: details[0].price?.value ?? '0' },
        },
      },
    );

    const response = await request.show();
    const purchaseToken: string = response.details.purchaseToken;
    const productId: string = response.details.productId ?? sku;

    // ── Verify with our backend before acknowledging ──────────────
    const { data: { session: s } } = await supabase.auth.getSession();
    const token = s?.access_token;
    if (!token) {
      await response.complete('fail');
      return { ok: false, reason: 'verify_failed', message: 'Session expired' };
    }

    const verify = await fetch('/api/play-verify-purchase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ purchaseToken, productId }),
    });

    if (!verify.ok) {
      await response.complete('fail');
      const body = await verify.json().catch(() => ({}));
      return {
        ok: false,
        reason: 'verify_failed',
        message: (body && (body as any).error) || `Verify failed (${verify.status})`,
      };
    }

    await response.complete('success');

    // Acknowledge the purchase so Play stops marking it as pending. For
    // subscriptions you must call this within 3 days or Google refunds
    // automatically. The DigitalGoodsService API exposes it directly.
    try {
      if (typeof service.acknowledge === 'function') {
        await service.acknowledge(purchaseToken, 'repeatable');
      }
    } catch {
      // Non-fatal — the backend will also acknowledge from the RTDN webhook
      // as a belt-and-braces second attempt.
    }

    return { ok: true, purchaseToken, productId };
  } catch (err: any) {
    if (err && (err.name === 'AbortError' || /cancel/i.test(err.message ?? ''))) {
      return { ok: false, reason: 'cancelled' };
    }
    return { ok: false, reason: 'unknown', message: err?.message ?? 'Unknown Play Billing error' };
  }
}
