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

export function useMarket() {
  const { i18n } = useTranslation();
  const lang = i18n.language || 'es';
  const market: Market = getMarket(lang);
  const isUS = market === 'us';

  return {
    market,
    isUS,
    lang,
    currency:      getCurrency(lang),
    formatPrice:   (amount: number) => formatPrice(amount, lang),
    formatDate:    (date: string) => formatDate(date, lang),
    stripeConfig:  STRIPE_PRICES[market],
    initIngredients: isUS ? INIT_INGS_US : INIT_INGS,
    categories:    isUS ? CATEGORIES_US : CATEGORIES,
    catEmoji:      isUS ? CAT_EMOJI_US  : CAT_EMOJI,
    catBg:         isUS ? CAT_BG_US     : CAT_BG,
    catText:       isUS ? CAT_TEXT_US   : CAT_TEXT,
    monthNames:    isUS ? MONTH_NAMES_EN : MONTH_NAMES,
    weekDays:      isUS ? WEEK_DAYS_EN   : WEEK_DAYS,
  };
}
