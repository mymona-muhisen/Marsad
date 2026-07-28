import { QueryClient } from '@tanstack/react-query'

import { ApiError } from './api/errors'

/**
 * Shared defaults for all server state.
 *
 * Retries are deliberately narrow: a 4xx from Laravel is a decision, not a
 * hiccup, and retrying a 422 or 403 only delays showing the user what went
 * wrong. Connectivity failures (status 0) are the one case worth retrying,
 * which matters on the patchy mobile networks this platform targets.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        retry: (failureCount, error) => {
          if (error instanceof ApiError) {
            return error.isOffline && failureCount < 2
          }
          return failureCount < 2
        },
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  })
}
