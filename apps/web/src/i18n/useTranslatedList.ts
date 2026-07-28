import { useTranslation } from 'react-i18next'

/**
 * Reads an array out of the lang files (e.g. the landing page's step list).
 *
 * i18next types `returnObjects` results loosely, so the cast is unavoidable;
 * the runtime `Array.isArray` check keeps a mistyped key from crashing a page
 * — a missing translation should degrade to an empty section, not a blank app.
 */
export function useTranslatedList<T>(key: string): T[] {
  const { t } = useTranslation()
  const value = t(key, { returnObjects: true })

  return Array.isArray(value) ? (value as T[]) : []
}
