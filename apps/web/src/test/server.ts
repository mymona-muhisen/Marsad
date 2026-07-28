import { setupServer } from 'msw/node'

/**
 * Shared MSW server. Handlers are registered per test with `server.use(...)`
 * so each test states exactly the API behaviour it depends on.
 */
export const server = setupServer()
