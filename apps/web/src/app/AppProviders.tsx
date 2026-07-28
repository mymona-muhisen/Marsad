import { useMemo, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { AuthProvider } from '@/features/auth/AuthProvider'
import { createQueryClient } from '@/lib/query-client'
import { useLocale } from '@/i18n/useLocale'

/** Keeps `<html lang>`/`<html dir>` in step with the active locale. */
function LocaleSync() {
  useLocale()
  return null
}

type Props = {
  children: ReactNode
  /** Tests inject their own client to keep caches isolated per test. */
  queryClient?: QueryClient
}

export function AppProviders({ children, queryClient }: Props) {
  const client = useMemo(
    () => queryClient ?? createQueryClient(),
    [queryClient],
  )

  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <LocaleSync />
        {children}
      </AuthProvider>
    </QueryClientProvider>
  )
}
