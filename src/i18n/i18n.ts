import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { en } from './locales/en';
import { es } from './locales/es';

// If ?lang=en or ?lang=es is in the URL, honour it immediately and persist it.
// This is the most reliable way to set language from a landing page link.
const urlLang = new URLSearchParams(window.location.search).get('lang');
if (urlLang === 'en' || urlLang === 'es') {
  try { localStorage.setItem('midespensa_lang', urlLang); } catch (_) {}
}

// Normalize the cached language: always store 'en' or 'es', never 'en-US' / 'es-ES'.
// i18next LanguageDetector caches the raw navigator.language before load:'languageOnly'
// strips the region suffix, so we fix it here.
try {
  const cached = localStorage.getItem('midespensa_lang');
  if (cached && cached !== 'en' && cached !== 'es') {
    const norm = cached.toLowerCase().startsWith('en') ? 'en' : 'es';
    localStorage.setItem('midespensa_lang', norm);
  }
} catch (_) {}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
    },
    fallbackLng: 'es',
    // Detection order: querystring → localStorage → navigator language → fallback
    detection: {
      order: ['querystring', 'localStorage', 'navigator'],
      lookupQuerystring: 'lang',
      lookupLocalStorage: 'midespensa_lang',
      caches: ['localStorage'],
    },
    // Map 'en-US', 'en-GB' → 'en'; 'es-ES', 'es-MX' → 'es'
    load: 'languageOnly',
    supportedLngs: ['en', 'es'],
    interpolation: { escapeValue: false },
  });

export default i18n;
export type Lang = 'en' | 'es';
