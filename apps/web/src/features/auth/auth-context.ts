import { createContext } from 'react'
import type { User } from '@/lib/api/types'

/**
 * `error` is kept distinct from `anonymous` on purpose: a failed /auth/me due
 * to a dropped connection must not look like "signed out" and bounce the user
 * to the login screen — they'd lose their place for a transient network blip.
 */
export type AuthStatus = 'loading' | 'authenticated' | 'anonymous' | 'error'

export type AuthContextValue = {
  status: AuthStatus
  user: User | null
  signIn: (token: string, user: User) => void
  signOut: () => Promise<void>
  /** Re-runs /auth/me — what the error state's retry button calls. */
  refresh: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export const AUTH_QUERY_KEY = ['auth', 'me'] as const
