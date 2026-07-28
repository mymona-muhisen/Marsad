import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import ar from './locales/ar.json'
import en from './locales/en.json'
import { DEFAULT_LOCALE, storedLocale } from './config'

void i18n.use(initReactI18next).init({
  resources: {
    ar: { translation: ar },
    en: { translation: en },
  },
  lng: storedLocale(),
  fallbackLng: DEFAULT_LOCALE,
  interpolation: {
    // React escapes for us; double-escaping mangles Arabic punctuation.
    escapeValue: false,
  },
})

export default i18n
