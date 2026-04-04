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
    // DEV OVERRIDE: ?dev=us or ?dev=es forces market without touching localStorage
    // e.g. http://localhost:5173/?dev=us  — remove the param to go back to normal
    if (typeof window !== 'undefined') {
      const devParam = new URLSearchParams(window.location.search).get('dev') as Market | null;
      if (devParam === 'us' || devParam === 'es') return devParam;
    }
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

  // UI market: follows current language — used only to seed billingMarket on first visit
  const uiMarket: Market = getMarket(lang);

  // Content/billing market: locked on first visit — determines categories, stores, ingredients & pricing
  const billingMarket: Market = getBillingMarket(uiMarket);
  const isUS = billingMarket === 'us';   // LOCKED — content market (categories, stores, ingredients)
  const isEN = lang.startsWith('en');    // CURRENT language — text translation direction only

  return {
    market: billingMarket,
    isUS,   // use for: categories, stores, ingredients, stripeConfig, WIZARD_CATS, DIET_SETS
    isEN,   // use for: all UI text ternaries (button labels, titles, messages)
    lang,
    currency:        getCurrency(isUS ? 'en' : 'es'),
    formatPrice:     (amount: number) => formatPrice(amount, isUS ? 'en' : 'es'),
    formatDate:      (date: string) => formatDate(date, lang),
    // Pricing always uses locked billing market
    stripeConfig:    STRIPE_PRICES[billingMarket],
    initIngredients: isUS ? INIT_INGS_US : INIT_INGS,
    categories:      isUS ? CATEGORIES_US : CATEGORIES,
    catEmoji:        isUS ? CAT_EMOJI_US  : CAT_EMOJI,
    catBg:           isUS ? CAT_BG_US     : CAT_BG,
    catText:         isUS ? CAT_TEXT_US   : CAT_TEXT,
    monthNames:      isEN ? MONTH_NAMES_EN : MONTH_NAMES,   // follow language
    weekDays:        isEN ? WEEK_DAYS_EN   : WEEK_DAYS,     // follow language
  };
}
