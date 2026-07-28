const TOKEN_KEY = 'masar.auth.token'

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
      return window.localStorage.getItem(TOKEN_KEY)
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
    } catch {
      // Already unreachable — treat as cleared.
    }
  },
}
