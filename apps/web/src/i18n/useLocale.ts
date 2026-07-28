import { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import {
  DEFAULT_LOCALE,
  directionFor,
  isLocale,
  storeLocale,
  type Locale,
} from './config'

type UseLocale = {
  locale: Locale
  direction: 'rtl' | 'ltr'
  setLocale: (next: Locale) => void
  /** Flips between the two supported locales — what the header button calls. */
  toggleLocale: () => void
}

/**
 * Current locale plus the document-level side effects that go with it.
 *
 * `<html dir>` and `<html lang>` are owned here rather than in index.html so
 * switching to English actually re-mirrors the layout instead of leaving an
 * RTL page with English text in it.
 */
export function useLocale(): UseLocale {
  const { i18n } = useTranslation()

  const locale: Locale = isLocale(i18n.language)
    ? i18n.language
    : DEFAULT_LOCALE
  const direction = directionFor(locale)

  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = direction
  }, [locale, direction])

  const setLocale = useCallback(
    (next: Locale) => {
      storeLocale(next)
      void i18n.changeLanguage(next)
    },
    [i18n],
  )

  const toggleLocale = useCallback(() => {
    setLocale(locale === 'ar' ? 'en' : 'ar')
  }, [locale, setLocale])

  return { locale, direction, setLocale, toggleLocale }
}
