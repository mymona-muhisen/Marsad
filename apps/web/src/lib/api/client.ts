import { ApiError, type ApiErrorBody } from './errors'
import { tokenStorage } from './token-storage'

/**
 * In dev this stays `/api` and Vite proxies it to `php artisan serve`, so the
 * browser never crosses an origin. In production set `VITE_API_URL` to the
 * deployed API's origin.
 */
const BASE_URL = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '')

/** Every endpoint lives under the versioned prefix (CLAUDE.md rule #1). */
const VERSION = 'v1'

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  /** Plain objects are JSON-encoded; FormData is passed through for uploads. */
  body?: unknown
  query?: Record<string, string | number | boolean | undefined>
  signal?: AbortSignal
  /** Skip the Authorization header — for the public endpoints. */
  anonymous?: boolean
}

let onUnauthenticated: (() => void) | null = null

/**
 * Registered once by the auth provider. A revoked or expired token can surface
 * on any request, so the reaction (drop the session, bounce to login) is
 * centralised here instead of being repeated at every call site.
 */
export function setUnauthenticatedHandler(handler: (() => void) | null): void {
  onUnauthenticated = handler
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = `${BASE_URL}/${VERSION}/${path.replace(/^\//, '')}`
  if (!query) return url

  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value))
  }
  const search = params.toString()
  return search ? `${url}?${search}` : url
}

function parseRetryAfter(response: Response): number | null {
  const header = response.headers.get('Retry-After')
  if (!header) return null
  const seconds = Number(header)
  return Number.isFinite(seconds) ? seconds : null
}

async function readErrorBody(response: Response): Promise<ApiErrorBody> {
  try {
    return (await response.json()) as ApiErrorBody
  } catch {
    return {}
  }
}

/**
 * The single door to the API. Returns parsed JSON on success and throws
 * `ApiError` on everything else — including network failures, which arrive as
 * status 0 so callers can tell "offline" from "server said no".
 */
export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, query, signal, anonymous = false } = options

  const headers: Record<string, string> = { Accept: 'application/json' }

  if (!anonymous) {
    const token = tokenStorage.get()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  // FormData must set its own multipart boundary — never override it.
  const isFormData = body instanceof FormData
  if (body !== undefined && !isFormData) {
    headers['Content-Type'] = 'application/json'
  }

  let response: Response
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      signal,
      body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch (cause) {
    // AbortError is a caller-initiated cancel, not a connectivity problem.
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause
    throw new ApiError(0, 'network_error')
  }

  if (response.status === 204) return undefined as T

  if (!response.ok) {
    const payload = await readErrorBody(response)

    if (response.status === 401) {
      tokenStorage.clear()
      onUnauthenticated?.()
    }

    throw new ApiError(
      response.status,
      payload.message ?? `HTTP ${response.status}`,
      payload.errors ?? {},
      parseRetryAfter(response),
    )
  }

  return (await response.json()) as T
}

/** Unwraps Laravel's `{ data: ... }` API-resource envelope. */
export async function apiFetchResource<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const payload = await apiFetch<{ data: T }>(path, options)
  return payload.data
}
