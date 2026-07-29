import { supabase } from './supabase';

export interface PromoState {
  ref_code?: string;
  shares: number;
  referrals: number;
  review_claimed: boolean;
}

export interface PromoResult {
  ok?: boolean;
  error?: string;
  promo?: PromoState;
  granted_days?: number;
  trial_end?: number | null;
  promo_active?: boolean;
}

async function callPromo(action: string, code?: string): Promise<PromoResult | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return null;

    const res = await fetch('/api/promo-reward', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ action, ...(code ? { code } : {}) }),
    });
    return await res.json() as PromoResult;
  } catch {
    return null;
  }
}

/** Load current promo state (also generates ref_code if missing). */
export const getPromoState = () => callPromo('get');

/** Register a completed share. Server grants +7d (1st) / +5d (5th) during promo. */
export const registerShare = () => callPromo('share');

/** Claim the Play Store review reward (+7 days Pro, one-time). */
export const claimReviewReward = () => callPromo('review');

/** Redeem a referral code entered by a new user (+1 day for the referrer). */
export const redeemReferral = (code: string) => callPromo('redeem_referral', code);

/** Play Store listing URL for reviews. */
export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=app.midespensa.twa';

/** Build the share URL with the user's referral code. */
export const buildShareUrl = (refCode?: string) =>
  refCode ? `https://midespensa.app/?ref=${refCode}` : 'https://midespensa.app';
