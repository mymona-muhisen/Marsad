import { HttpResponse, http } from 'msw'
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { server } from '@/test/server'
import { makeUser, renderWithProviders, signInWithToken } from '@/test/utils'
import type { Role } from '@/lib/roles'
import { AppRoutes } from './AppRoutes'

function mockMe(roles: Role[]) {
  server.use(
    http.get('/api/v1/auth/me', () =>
      HttpResponse.json({ data: makeUser({ roles }) }),
    ),
  )
}

describe('route guards', () => {
  it('sends an anonymous visitor to the login screen', async () => {
    renderWithProviders(<AppRoutes />, { route: '/app' })

    expect(
      await screen.findByRole('heading', { name: 'تسجيل الدخول' }),
    ).toBeInTheDocument()
  })

  it('lets a signed-in user reach the app home', async () => {
    signInWithToken()
    mockMe(['citizen'])

    renderWithProviders(<AppRoutes />, { route: '/app' })

    expect(
      await screen.findByRole('heading', { name: /محمد أحمد/ }),
    ).toBeInTheDocument()
  })

  it('lists only the sections the user’s roles unlock', async () => {
    signInWithToken()
    mockMe(['citizen'])

    renderWithProviders(<AppRoutes />, { route: '/app' })

    expect(await screen.findByText('قضاياي')).toBeInTheDocument()
    // Adjudication belongs to a different role and must not be advertised.
    expect(screen.queryByText('قائمة المراجعة')).not.toBeInTheDocument()
  })

  it('blocks a role-guarded route for the wrong role', async () => {
    signInWithToken()
    mockMe(['citizen'])

    renderWithProviders(<AppRoutes />, { route: '/app/adjudication/queue' })

    expect(
      await screen.findByRole('heading', {
        name: 'لا تملك صلاحية الوصول إلى هذه الصفحة.',
      }),
    ).toBeInTheDocument()
  })

  it('allows a role-guarded route for the right role', async () => {
    signInWithToken()
    mockMe(['adjudicator'])

    renderWithProviders(<AppRoutes />, { route: '/app/adjudication/queue' })

    expect(
      await screen.findByRole('heading', { name: 'قائمة المراجعة' }),
    ).toBeInTheDocument()
  })

  it('keeps the user in place when /auth/me fails on a network error', async () => {
    signInWithToken()
    server.use(http.get('/api/v1/auth/me', () => HttpResponse.error()))

    renderWithProviders(<AppRoutes />, { route: '/app' })

    // A dropped connection offers a retry — it must not look like a sign-out.
    expect(
      await screen.findByRole('button', { name: 'إعادة المحاولة' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'تسجيل الدخول' }),
    ).not.toBeInTheDocument()
  })

  it('drops the session when the token is rejected', async () => {
    signInWithToken('revoked')
    server.use(
      http.get('/api/v1/auth/me', () =>
        HttpResponse.json({ message: 'Unauthenticated.' }, { status: 401 }),
      ),
    )

    renderWithProviders(<AppRoutes />, { route: '/app' })

    expect(
      await screen.findByRole('heading', { name: 'تسجيل الدخول' }),
    ).toBeInTheDocument()
    expect(window.localStorage.getItem('masar.auth.token')).toBeNull()
  })
})
