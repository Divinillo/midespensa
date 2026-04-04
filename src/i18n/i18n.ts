import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { en } from './locales/en';
import { es } from './locales/es';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
    },
    fallbackLng: 'es',
    // Detection order: localStorage → navigator language → fallback
    detection: {
      order: ['localStorage', 'navigator'],
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
