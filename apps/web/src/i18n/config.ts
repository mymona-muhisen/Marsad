export const SUPPORTED_LOCALES = ['ar', 'en'] as const

export type Locale = (typeof SUPPORTED_LOCALES)[number]

/** Arabic-first: the platform's users are Arabic speakers by default. */
export const DEFAULT_LOCALE: Locale = 'ar'

const RTL_LOCALES: readonly Locale[] = ['ar']

const LOCALE_KEY = 'masar.locale'

export function isLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

export function directionFor(locale: Locale): 'rtl' | 'ltr' {
  return RTL_LOCALES.includes(locale) ? 'rtl' : 'ltr'
}

/**
 * A previously chosen locale, if any. Deliberately does NOT fall back to the
 * browser's `navigator.language`: a Syrian user on an English-configured phone
 * still wants the Arabic UI, so the default wins until they choose otherwise.
 */
export function storedLocale(): Locale {
  try {
    const stored = window.localStorage.getItem(LOCALE_KEY)
    if (stored && isLocale(stored)) return stored
  } catch {
    // Storage unavailable — fall through to the default.
  }
  return DEFAULT_LOCALE
}

export function storeLocale(locale: Locale): void {
  try {
    window.localStorage.setItem(LOCALE_KEY, locale)
  } catch {
    // Preference lasts for this session only.
  }
}
