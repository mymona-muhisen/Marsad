import type { ReactNode } from 'react'
import { QueryClient } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'

import { AppProviders } from '@/app/AppProviders'
import type { User } from '@/lib/api/types'
import type { Role } from '@/lib/roles'

/** Retries off: a test asserting an error state should not wait out backoff. */
function testQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
      mutations: { retry: false },
    },
  })
}

export function renderWithProviders(
  ui: ReactNode,
  { route = '/' }: { route?: string } = {},
) {
  const queryClient = testQueryClient()

  return {
    queryClient,
    ...render(
      <MemoryRouter initialEntries={[route]}>
        <AppProviders queryClient={queryClient}>{ui}</AppProviders>
      </MemoryRouter>,
    ),
  }
}

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    full_name: 'محمد أحمد',
    phone: '0911111111',
    locale: 'ar',
    status: 'active',
    organization_id: null,
    roles: ['citizen'] as Role[],
    ...overrides,
  }
}

/** Puts a token in storage so the auth provider boots into a signed-in state. */
export function signInWithToken(token = 'test-token'): void {
  window.localStorage.setItem('marsad.auth.token', token)
}
