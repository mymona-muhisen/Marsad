import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

let media: MediaQueryList | null = null

/** Lazily resolved so the module stays importable where matchMedia is absent. */
function mediaQuery(): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function')
    return null
  media ??= window.matchMedia(QUERY)
  return media
}

function subscribe(onChange: () => void) {
  const query = mediaQuery()
  if (!query) return () => undefined
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

const getSnapshot = () => mediaQuery()?.matches ?? false

/**
 * Tracks the user's reduced-motion preference and reacts to changes at runtime.
 * Falls back to `false` where `matchMedia` is unavailable (SSR, jsdom).
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
