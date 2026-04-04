/**
 * Market detection utilities.
 * US market = language starts with 'en'
 * ES market = language starts with 'es' (or any other)
 */

export type Market = 'us' | 'es';

export function getMarket(lang: string): Market {
  return lang?.startsWith('en') ? 'us' : 'es';
}

/** Currency symbol for the active market */
export function getCurrency(lang: string): string {
  return getMarket(lang) === 'us' ? '$' : '€';
}

/**
 * Format a monetary amount for the active market.
 * US: $1,234.56 | ES: 1.234,56 €
 */
export function formatPrice(amount: number, lang: string): string {
  const market = getMarket(lang);
  if (market === 'us') {
    return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

/**
 * Format a date for the active market.
 * US: MM/DD/YYYY | ES: DD/MM/YYYY
 */
export function formatDate(dateStr: string, lang: string): string {
  if (!dateStr) return '';
  // Try to parse ISO or DD/MM/YYYY or MM/DD/YYYY
  const parts = dateStr.split(/[-/]/);
  if (parts.length < 3) return dateStr;
  let day: string, month: string, year: string;
  if (dateStr.includes('-')) {
    // ISO: YYYY-MM-DD
    [year, month, day] = parts;
  } else if (getMarket(lang) === 'us') {
    // Incoming might be DD/MM/YYYY (from Spanish receipts) or MM/DD/YYYY
    [day, month, year] = parts; // assume stored as DD/MM/YYYY internally
  } else {
    [day, month, year] = parts;
  }
  return getMarket(lang) === 'us'
    ? `${month}/${day}/${year}`
    : `${day}/${month}/${year}`;
}

/** Stripe price IDs / amounts per market */
export const STRIPE_PRICES = {
  us: { monthly: 4.99, yearly: 39.99, currency: 'usd', symbol: '$' },
  es: { monthly: 2.99, yearly: 29.99, currency: 'eur', symbol: '€' },
};
