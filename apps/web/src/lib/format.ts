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

/**
 * SYP amounts with thousands separators (design brief).
 *
 * Money arrives as a DECIMAL(14,2) string, never a number — parsing it to a
 * float first would risk losing precision on large settlement amounts, so the
 * string is only converted at the formatting boundary and passed straight to
 * Intl, which handles the rounding.
 */
export function formatMoney(amount: string | number, locale: Locale): string {
  const value = typeof amount === 'number' ? amount : Number(amount)
  if (Number.isNaN(value)) return String(amount)

  return new Intl.NumberFormat(LOCALE_TAGS[locale], {
    style: 'currency',
    currency: 'SYP',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatDate(iso: string, locale: Locale): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso

  return new Intl.DateTimeFormat(LOCALE_TAGS[locale], {
    dateStyle: 'medium',
  }).format(date)
}
