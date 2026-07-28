import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll } from 'vitest'

import '@/i18n'
import { server } from './server'

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
