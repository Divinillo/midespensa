// Detect whether the app is running inside the Android Trusted Web Activity
// (i.e. installed from Google Play) versus a normal browser / installed PWA
// on another platform. We need this to switch the paywall flow:
//
//   - In the Android TWA → must use Google Play Billing (Digital Goods API),
//     otherwise we violate Google Play's payments policy and the app will be
//     removed from the store.
//   - In a regular browser / iOS / desktop PWA → keep using Stripe checkout.
//
// We combine three signals so the detection is robust against future Chrome
// changes:
//
//   1. document.referrer starting with "android-app://" — Chrome sets this
//      when a TWA opens the underlying PWA. Most reliable signal.
//   2. ?source=twa appended to the manifest start_url. We control this and
//      it survives the navigation chain inside the TWA shell.
//   3. The presence of `getDigitalGoodsService` on `window` — only exposed
//      to TWAs that declare Play Billing support in the manifest.
//
// Any single signal is enough to flip into TWA mode. We cache the result
// because the document.referrer can be lost on subsequent client-side
// navigations.

const STORAGE_KEY = 'midespensa.isAndroidTwa';

let cached: boolean | null = null;

export function isAndroidTwa(): boolean {
  if (cached !== null) return cached;

  if (typeof window === 'undefined') {
    cached = false;
    return cached;
  }

  // Persisted detection from a previous page-load (referrer is gone after
  // client-side navigation, so we have to remember it once it fires).
  try {
    if (window.localStorage?.getItem(STORAGE_KEY) === '1') {
      cached = true;
      return cached;
    }
  } catch {
    /* localStorage might be blocked — ignore */
  }

  // 1) document.referrer set by Chrome when launched from a TWA
  const referrer = typeof document !== 'undefined' ? document.referrer : '';
  const isTwaReferrer = referrer.startsWith('android-app://');

  // 2) ?source=twa flag appended to manifest start_url
  let isTwaQuery = false;
  try {
    const params = new URLSearchParams(window.location.search);
    isTwaQuery = params.get('source') === 'twa';
  } catch {
    /* malformed URL — ignore */
  }

  // 3) Digital Goods API available — only TWAs with Play Billing get it
  const hasDigitalGoods =
    typeof (window as any).getDigitalGoodsService === 'function';

  cached = isTwaReferrer || isTwaQuery || hasDigitalGoods;

  if (cached) {
    try {
      window.localStorage?.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
  }

  return cached;
}

/**
 * Convenience for React components that prefer a constant. Note this is a
 * snapshot at module-load time — components that need it reactively should
 * call `isAndroidTwa()` directly.
 */
export const IS_ANDROID_TWA: boolean =
  typeof window !== 'undefined' ? isAndroidTwa() : false;
