import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { setUnauthenticatedHandler } from '@/lib/api/client'
import { tokenStorage } from '@/lib/api/token-storage'
import type { User } from '@/lib/api/types'
import { fetchMe, logoutRequest } from './api'
import {
  AUTH_QUERY_KEY,
  AuthContext,
  type AuthContextValue,
  type AuthStatus,
} from './auth-context'

/**
 * Owns the session. The token lives in localStorage (so a reload keeps you
 * signed in) while the *user* is server state fetched through TanStack Query,
 * per CLAUDE.md's rule that all server state goes through the query client —
 * a stale cached user would otherwise outlive a role change made by an admin.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [token, setToken] = useState<string | null>(() => tokenStorage.get())

  const query = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: fetchMe,
    enabled: token !== null,
    // A rejected token will keep being rejected; retrying just delays the
    // redirect to login. Network failures surface as the `error` status.
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  // A 401 can come back from any request, not just /auth/me — an admin may
  // have revoked the token mid-session. Drop the session wherever it happens.
  useEffect(() => {
    setUnauthenticatedHandler(() => {
      setToken(null)
      queryClient.removeQueries({ queryKey: AUTH_QUERY_KEY })
    })
    return () => setUnauthenticatedHandler(null)
  }, [queryClient])

  const signIn = useCallback(
    (nextToken: string, user: User) => {
      tokenStorage.set(nextToken)
      setToken(nextToken)
      // Seed the cache from the verify response so the shell renders without
      // a second round-trip to /auth/me.
      queryClient.setQueryData(AUTH_QUERY_KEY, user)
    },
    [queryClient],
  )

  const signOut = useCallback(async () => {
    try {
      await logoutRequest()
    } catch {
      // Already expired or revoked server-side — the local session still goes.
    }
    tokenStorage.clear()
    setToken(null)
    queryClient.clear()
  }, [queryClient])

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY })
  }, [queryClient])

  const status: AuthStatus = useMemo(() => {
    if (token === null) return 'anonymous'
    if (query.data) return 'authenticated'
    if (query.isError) return 'error'
    return 'loading'
  }, [token, query.data, query.isError])

  const value: AuthContextValue = useMemo(
    () => ({
      status,
      user: status === 'authenticated' ? (query.data ?? null) : null,
      signIn,
      signOut,
      refresh,
    }),
    [status, query.data, signIn, signOut, refresh],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
