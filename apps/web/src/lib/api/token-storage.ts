const TOKEN_KEY = 'marsad.auth.token'

/** Pre-rename key. Read once so the platform rename does not sign anyone out. */
const LEGACY_TOKEN_KEY = 'masar.auth.token'

/**
 * Sanctum plain-text token persistence.
 *
 * Every access is guarded: Safari private mode and locked-down Android
 * browsers throw on `localStorage`, and losing the session is a far better
 * outcome than the whole app failing to boot.
 */
export const tokenStorage = {
  get(): string | null {
    try {
      const current = window.localStorage.getItem(TOKEN_KEY)
      if (current !== null) return current

      // Carry a session across the rename, then retire the old key so this
      // branch stops being reachable.
      const legacy = window.localStorage.getItem(LEGACY_TOKEN_KEY)
      if (legacy !== null) {
        window.localStorage.setItem(TOKEN_KEY, legacy)
        window.localStorage.removeItem(LEGACY_TOKEN_KEY)
      }

      return legacy
    } catch {
      return null
    }
  },

  set(token: string): void {
    try {
      window.localStorage.setItem(TOKEN_KEY, token)
    } catch {
      // Session lives for this tab only; nothing else to do.
    }
  },

  clear(): void {
    try {
      window.localStorage.removeItem(TOKEN_KEY)
      window.localStorage.removeItem(LEGACY_TOKEN_KEY)
    } catch {
      // Already unreachable — treat as cleared.
    }
  },
}
