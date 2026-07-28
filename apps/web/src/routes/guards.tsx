import { useTranslation } from 'react-i18next'
import { Link, Navigate, Outlet, useLocation } from 'react-router'

import {
  FullPageError,
  FullPageLoading,
  FullPageMessage,
} from '@/components/feedback/FullPageState'
import { useAuth } from '@/features/auth/useAuth'
import { hasAnyRole, type Role } from '@/lib/roles'

/**
 * Gate for anything behind a session.
 *
 * Note the four-way split: a failed /auth/me caused by a dropped connection
 * renders a retry instead of redirecting to login, because bouncing a signed-in
 * user out over a momentary network blip loses their place for no reason.
 */
export function RequireAuth() {
  const { status, refresh } = useAuth()
  const { t } = useTranslation()
  const location = useLocation()

  if (status === 'loading') {
    return <FullPageLoading label={t('common.loading')} />
  }

  if (status === 'error') {
    return (
      <FullPageError
        title={t('errors.network')}
        retryLabel={t('common.retry')}
        onRetry={refresh}
      />
    )
  }

  if (status === 'anonymous') {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    )
  }

  return <Outlet />
}

/**
 * Renders children only for the listed roles. This mirrors the backend's
 * `role:` middleware for navigation purposes — the API stays the enforcement
 * point, so a user who forges their way here still gets a 403 from the server.
 */
export function RequireRole({ allowed }: { allowed: readonly Role[] }) {
  const { user } = useAuth()
  const { t } = useTranslation()

  if (!user) return <Navigate to="/login" replace />

  if (!hasAnyRole(user.roles, allowed)) {
    return (
      <FullPageMessage
        title={t('errors.forbidden')}
        action={
          <Link
            to="/app"
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border px-5 text-sm font-semibold transition hover:bg-foreground/5"
          >
            {t('common.goHome')}
          </Link>
        }
      />
    )
  }

  return <Outlet />
}
