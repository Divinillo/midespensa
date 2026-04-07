# Google Play Billing — Setup checklist

End-to-end steps to take MiDespensa from "Stripe-only on web" to
"Stripe on web + Play Billing inside the Android TWA". Do these in
order; the code is already on `main`.

## 1. Supabase migration

Run `supabase-play-billing-migration.sql` in **Supabase → SQL Editor**.
Adds two columns (`play_product_id`, `play_expiry`) to `licencias` and
an index on `session_id` for the RTDN webhook lookup.

## 2. Google Play Console — create the subscription

1. Open the new **organization** developer account (D-U-N-S 373952727).
2. Create the MiDespensa app, upload the new AAB once available
   (versionCode 2 / versionName 1.1.0).
3. Go to **Monetize → Products → Subscriptions → Create subscription**.
   - Product ID: **`pro_monthly`** (must match `PLAY_SKU_PRO_MONTHLY`
     in `src/utils/playBilling.ts`).
   - Name: `MiDespensa Pro mensual`.
   - Description: same copy used in the web upgrade modal.
4. Add a **base plan**:
   - Base plan ID: `monthly`.
   - Billing period: `P1M` (monthly, auto-renewing).
   - Set the price for **Spain → 2,99 €** and for **United States → 4,99 $**.
     Add other regions if you want pricing parity.
5. **Activate** the subscription. It must be active for
   `getDigitalGoodsService` to find the SKU.

## 3. Google Cloud — service account for the verify endpoint

1. In Google Cloud Console open the project linked to the Play Console
   (Settings → Developer account → API access). Create one if needed.
2. **Enable** the *Google Play Android Developer API*.
3. Create a new **service account** with the role `Service Account User`.
4. In Play Console → API access, **link** the service account and grant
   it the `View financial data` + `Manage orders and subscriptions`
   permissions for the MiDespensa app only.
5. Download the JSON key. Copy the `client_email` and the entire
   `private_key` value (including the `-----BEGIN PRIVATE KEY-----` and
   the literal `\n` line breaks).

## 4. Cloudflare Pages — environment variables

Add these to **Pages → midespensa-vite → Settings → Environment variables**
(both Production and Preview if you want to test in previews):

| Name | Value |
|---|---|
| `PLAY_PACKAGE_NAME` | `app.midespensa.twa` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `play@<project>.iam.gserviceaccount.com` |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | The full `private_key` PEM (with `\n` preserved) |
| `PLAY_RTDN_SHARED_SECRET` | A long random string of your choice |

Redeploy after saving so the new env vars take effect.

## 5. Real-time Developer Notifications (RTDN)

1. In Google Cloud Console → **Pub/Sub**, create a topic
   `play-rtdn-midespensa`.
2. Grant `roles/pubsub.publisher` on that topic to
   `google-play-developer-notifications@system.gserviceaccount.com`.
3. Create a **push subscription** on the topic with endpoint:
   `https://midespensa.app/api/play-billing-webhook?key=<PLAY_RTDN_SHARED_SECRET>`
4. In Play Console → **Monetize → Monetization setup → Real-time
   developer notifications**, paste the topic full name
   `projects/<your-project>/topics/play-rtdn-midespensa` and click
   **Send test notification**. The webhook should answer 200.

## 6. Build the new AAB

The Android manifest now declares the `PaymentActivity` and
`PaymentService` from `androidbrowserhelper:billing:1.0.0-alpha10`, and
the start URL is `https://midespensa.app/app?source=twa` so the client
detects the TWA reliably.

Trigger a new build of the AAB by pushing a tag:

```bash
git tag android-v1.1.0
git push origin android-v1.1.0
```

GitHub Actions will produce a signed `app-release.aab` you upload to
Play Console (Production track).

## 7. Test before public release

1. Add yourself as a **License tester** in Play Console
   (Setup → License testing). License testers can purchase
   subscriptions without being charged.
2. Upload the AAB to **Internal testing** track first.
3. Install via the testing link, sign in to MiDespensa, hit a paywall
   trigger (e.g. open a Pro-only feature), and complete the purchase
   from the Play sheet. The subscription should appear instantly in
   the Supabase `licencias` table.

## Notes / gotchas

- The Stripe pipeline keeps running untouched. Web users are unaffected.
- The TWA client only calls `/api/create-checkout` outside of the TWA;
  inside the TWA it calls `/api/play-verify-purchase` after the Play
  sheet returns a token.
- If a user paid via Stripe on the web and then opens the Android app,
  their `licencias` row already exists with `tier='pro'` and the app
  reads it via the existing sync flow — no double charge.
- If a Play subscriber later cancels in Play Store, the RTDN webhook
  flips `activa=false` automatically.
