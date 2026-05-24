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

  // ── Step-by-step with diagnostics ──────────────────────────────
  let step = 'init';
  try {
    // Step 1: get Digital Goods Service
    step = '1-getService';
    const service = await (window as any).getDigitalGoodsService(
      'https://play.google.com/billing',
    );

    // Step 2: query SKU details
    step = '2-getDetails';
    const details = await service.getDetails([sku]);
    if (!details || details.length === 0) {
      return { ok: false, reason: 'unsupported', message: `SKU "${sku}" not found in Play Console` };
    }

    // Step 3: check canMakePayment
    step = '3-createRequest';
    const request = new (window as any).PaymentRequest(
      [
        {
          supportedMethods: 'https://play.google.com/billing',
          data: { sku },
        },
      ],
      {
        total: {
          label: 'MiDespensa Pro',
          amount: { currency: details[0].price?.currency ?? 'EUR', value: details[0].price?.value ?? '0' },
        },
      },
    );

    step = '4-canMakePayment';
    const canPay = await request.canMakePayment();

    if (!canPay) {
      return { ok: false, reason: 'unsupported', message: `[step ${step}] canMakePayment=false. SKU=${sku}, price=${details[0].price?.value} ${details[0].price?.currency}` };
    }

    // Step 5: show payment sheet
    step = '5-show';
    const response = await request.show();
    const purchaseToken: string = response.details.purchaseToken;
    const productId: string = response.details.productId ?? sku;

    // Step 6: verify with backend
    step = '6-verify';
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

    try {
      if (typeof service.acknowledge === 'function') {
        await service.acknowledge(purchaseToken, 'repeatable');
      }
    } catch {
      // Non-fatal
    }

    return { ok: true, purchaseToken, productId };
  } catch (err: any) {
    if (err && (err.name === 'AbortError' || /cancel/i.test(err.message ?? ''))) {
      return { ok: false, reason: 'cancelled' };
    }
    return {
      ok: false,
      reason: 'unknown',
      message: `[step ${step}] ${err?.name ?? 'Error'}: ${err?.message ?? 'unknown'} | code=${err?.code ?? 'none'}`,
    };
  }
}
