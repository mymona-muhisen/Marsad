import '@testing-library/jest-dom/vitest'
import { configure } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'

import '@/i18n'
import { server } from './server'

/*
 * Testing Library's 1s default for findBy and waitFor is a wall-clock budget,
 * and every one of these assertions waits on a React Query round trip
 * through MSW.
 * With 27 files running in parallel the suite intermittently blew past it —
 * a different test failing on each run, all of them passing in isolation.
 *
 * Raised rather than chased per-test: the assertions were never wrong, the
 * machine was just loaded. A genuinely stuck query still fails, three seconds
 * later.
 */
configure({ asyncUtilTimeout: 3000 })

// jsdom ships no media pipeline, so play/pause raise "not implemented" noise.
// The landing page primes its background video on mount; stub them out.
Object.defineProperty(HTMLMediaElement.prototype, 'play', {
  configurable: true,
  writable: true,
  value: () => Promise.resolve(),
})

Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
  configurable: true,
  writable: true,
  value: () => undefined,
})

// jsdom implements no layout, so scrolling is a no-op rather than a method.
// The report wizard scrolls back to the top on every step change.
Object.defineProperty(Element.prototype, 'scrollIntoView', {
  configurable: true,
  writable: true,
  value: () => undefined,
})

// An unhandled request means a test is hitting an endpoint it never declared —
// fail loudly rather than hanging on a real network call.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

afterEach(() => {
  server.resetHandlers()
  window.localStorage.clear()
})

afterAll(() => server.close())
