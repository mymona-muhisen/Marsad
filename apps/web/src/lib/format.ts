import type { Locale } from '@/i18n/config'

/**
 * Arabic UI with Western digits — the design brief pins numbers to 0-9 so case
 * numbers, dates, and SYP amounts stay copyable and unambiguous.
 */
const LOCALE_TAGS: Record<Locale, string> = {
  ar: 'ar-SY-u-nu-latn',
  en: 'en-GB',
}

export function formatDateTime(iso: string, locale: Locale): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso

  return new Intl.DateTimeFormat(LOCALE_TAGS[locale], {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function formatDate(iso: string, locale: Locale): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso

  return new Intl.DateTimeFormat(LOCALE_TAGS[locale], {
    dateStyle: 'medium',
  }).format(date)
}
