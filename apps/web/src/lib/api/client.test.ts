import { HttpResponse, http } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { server } from '@/test/server'
import { apiFetch, apiFetchResource, setUnauthenticatedHandler } from './client'
import { ApiError } from './errors'
import { tokenStorage } from './token-storage'

afterEach(() => {
  setUnauthenticatedHandler(null)
})

describe('apiFetch', () => {
  it('sends the stored token as a bearer credential', async () => {
    tokenStorage.set('secret-token')
    let seen: string | null = null

    server.use(
      http.get('/api/v1/auth/me', ({ request }) => {
        seen = request.headers.get('Authorization')
        return HttpResponse.json({ data: { id: 1 } })
      }),
    )

    await apiFetch('auth/me')

    expect(seen).toBe('Bearer secret-token')
  })

  it('omits the token on anonymous endpoints', async () => {
    tokenStorage.set('secret-token')
    let seen: string | null = 'unset'

    server.use(
      http.get('/api/v1/reports/verify/abc', ({ request }) => {
        seen = request.headers.get('Authorization')
        return HttpResponse.json({ data: {} })
      }),
    )

    await apiFetch('reports/verify/abc', { anonymous: true })

    expect(seen).toBeNull()
  })

  it('unwraps the resource envelope', async () => {
    server.use(
      http.get('/api/v1/auth/me', () =>
        HttpResponse.json({ data: { id: 7, phone: '0911111111' } }),
      ),
    )

    await expect(apiFetchResource('auth/me')).resolves.toEqual({
      id: 7,
      phone: '0911111111',
    })
  })

  it('turns a 422 into a field-addressable ApiError', async () => {
    server.use(
      http.post('/api/v1/auth/otp/request', () =>
        HttpResponse.json(
          {
            message: 'بيانات غير صحيحة.',
            errors: { full_name: ['حقل الاسم الكامل مطلوب.'] },
          },
          { status: 422 },
        ),
      ),
    )

    const error = await apiFetch('auth/otp/request', {
      method: 'POST',
      body: { phone: '0911111111' },
    }).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiError)
    const apiError = error as ApiError
    expect(apiError.isValidation).toBe(true)
    expect(apiError.invalidFields).toEqual(['full_name'])
    expect(apiError.fieldError('full_name')).toBe('حقل الاسم الكامل مطلوب.')
  })

  it('drops the token and notifies the handler on 401', async () => {
    tokenStorage.set('revoked-token')
    const onUnauthenticated = vi.fn()
    setUnauthenticatedHandler(onUnauthenticated)

    server.use(
      http.get('/api/v1/auth/me', () =>
        HttpResponse.json({ message: 'Unauthenticated.' }, { status: 401 }),
      ),
    )

    await expect(apiFetch('auth/me')).rejects.toBeInstanceOf(ApiError)

    expect(tokenStorage.get()).toBeNull()
    expect(onUnauthenticated).toHaveBeenCalledOnce()
  })

  it('exposes Retry-After on a 429', async () => {
    server.use(
      http.post('/api/v1/auth/otp/request', () =>
        HttpResponse.json(
          { message: 'Too Many Attempts.' },
          { status: 429, headers: { 'Retry-After': '42' } },
        ),
      ),
    )

    const error = (await apiFetch('auth/otp/request', {
      method: 'POST',
      body: {},
    }).catch((caught: unknown) => caught)) as ApiError

    expect(error.isRateLimited).toBe(true)
    expect(error.retryAfter).toBe(42)
  })

  it('reports a dropped connection as offline rather than a server error', async () => {
    server.use(http.get('/api/v1/auth/me', () => HttpResponse.error()))

    const error = (await apiFetch('auth/me').catch(
      (caught: unknown) => caught,
    )) as ApiError

    expect(error.isOffline).toBe(true)
    expect(error.status).toBe(0)
  })

  it('appends defined query parameters only', async () => {
    let url = ''

    server.use(
      http.get('/api/v1/vehicles', ({ request }) => {
        url = request.url
        return HttpResponse.json({ data: [] })
      }),
    )

    await apiFetch('vehicles', { query: { page: 2, search: undefined } })

    expect(url).toContain('page=2')
    expect(url).not.toContain('search')
  })
})
