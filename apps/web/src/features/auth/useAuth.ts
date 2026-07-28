import { useContext } from 'react'

import { hasAnyRole, type Role } from '@/lib/roles'
import { AuthContext, type AuthContextValue } from './auth-context'

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>.')
  }

  return context
}

/**
 * Convenience for conditional UI. Never a substitute for the backend's
 * `role:` middleware — this only decides what to draw.
 */
export function useHasRole(...roles: Role[]): boolean {
  const { user } = useAuth()
  return user ? hasAnyRole(user.roles, roles) : false
}
