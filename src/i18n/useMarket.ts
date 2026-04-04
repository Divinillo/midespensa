import { useTranslation } from 'react-i18next';
import { getMarket, getCurrency, formatPrice, formatDate, STRIPE_PRICES } from './market';
import type { Market } from './market';
import { INIT_INGS } from '../data/ingredients';
import { INIT_INGS_US } from '../data/ingredients-us';
import {
  CATEGORIES, CAT_EMOJI, CAT_BG, CAT_TEXT,
  CATEGORIES_US, CAT_EMOJI_US, CAT_BG_US, CAT_TEXT_US,
  MONTH_NAMES, MONTH_NAMES_EN, WEEK_DAYS, WEEK_DAYS_EN,
} from '../data/categories';

const MARKET_KEY = 'midespensa_market';

/**
 * Returns the billing market, locked on first detection.
 * This prevents users from switching UI language to get a cheaper price.
 * The real enforcement is server-side (CF-IPCountry in create-checkout.ts),
 * but this keeps the displayed price consistent too.
 */
function getBillingMarket(detectedFromLang: Market): Market {
  try {
    const stored = localStorage.getItem(MARKET_KEY) as Market | null;
    if (stored === 'us' || stored === 'es') return stored;
    // First visit — lock market based on browser language
    localStorage.setItem(MARKET_KEY, detectedFromLang);
    return detectedFromLang;
  } catch {
    return detectedFromLang;
  }
}

export function useMarket() {
  const { i18n } = useTranslation();
  const lang = i18n.language || 'es';

  // UI market: follows current language (categories, month names, ingredient list)
  const uiMarket: Market = getMarket(lang);
  const isUS = uiMarket === 'us';

  // Billing market: locked on first visit — does NOT change when user switches language
  const billingMarket: Market = getBillingMarket(uiMarket);

  return {
    market: uiMarket,
    isUS,
    lang,
    currency:        getCurrency(lang),
    formatPrice:     (amount: number) => formatPrice(amount, lang),
    formatDate:      (date: string) => formatDate(date, lang),
    // Pricing uses billingMarket (locked) — not uiMarket (follows language toggle)
    stripeConfig:    STRIPE_PRICES[billingMarket],
    initIngredients: isUS ? INIT_INGS_US : INIT_INGS,
    categories:      isUS ? CATEGORIES_US : CATEGORIES,
    catEmoji:        isUS ? CAT_EMOJI_US  : CAT_EMOJI,
    catBg:           isUS ? CAT_BG_US     : CAT_BG,
    catText:         isUS ? CAT_TEXT_US   : CAT_TEXT,
    monthNames:      isUS ? MONTH_NAMES_EN : MONTH_NAMES,
    weekDays:        isUS ? WEEK_DAYS_EN   : WEEK_DAYS,
  };
}
