import { HttpResponse, http } from 'msw'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { AppRoutes } from '@/routes/AppRoutes'
import { server } from '@/test/server'
import { makeUser, renderWithProviders, signInWithToken } from '@/test/utils'
import type { Claim } from '@/lib/api/types'

const agent = () => makeUser({ roles: ['insurer_agent'] })
const admin = () => makeUser({ roles: ['insurer_admin'] })

function claim(overrides: Partial<Claim> = {}): Claim {
  return {
    id: 42,
    case_id: 3,
    case_no: 'MC-26-CLAIM1',
    claimant_party_id: 11,
    insurer_org_id: 1,
    assessor_org_id: null,
    status: 'assessing',
    sla_due_at: '2026-08-02T10:00:00.000000Z',
    sla_seconds_remaining: 3 * 86400,
    sla_breached: false,
    created_at: '2026-07-28T10:00:00.000000Z',
    events: [],
    estimates: [],
    settlement: null,
    ...overrides,
  }
}

const page = (rows: Claim[]) => ({
  data: rows,
  meta: { current_page: 1, last_page: 1, per_page: 50, total: rows.length },
})

function mockDetail(user = agent(), payload = claim()) {
  server.use(
    http.get('/api/v1/auth/me', () => HttpResponse.json({ data: user })),
    http.get('/api/v1/insurer/claims/42', () =>
      HttpResponse.json({ data: payload }),
    ),
    http.get('/api/v1/insurer/workshops', () =>
      HttpResponse.json({
        data: [
          {
            id: 9,
            name_ar: 'ورشة دمشق',
            name_en: 'Damascus Workshop',
            type: 'workshop',
            license_no: 'WS-001',
            status: 'active',
          },
        ],
      }),
    ),
  )
}

beforeEach(() => {
  signInWithToken()
})

describe('insurer claims table', () => {
  it('orders the queue by deadline, soonest first', async () => {
    const urgent = claim({ id: 1, case_no: 'MC-26-URGENT', sla_seconds_remaining: 600 })
    const later = claim({ id: 2, case_no: 'MC-26-LATER', sla_seconds_remaining: 5 * 86400 })

    server.use(
      http.get('/api/v1/auth/me', () => HttpResponse.json({ data: agent() })),
      // Server returns them in the wrong order for a working queue.
      http.get('/api/v1/insurer/claims', () =>
        HttpResponse.json(page([later, urgent])),
      ),
    )

    renderWithProviders(<AppRoutes />, { route: '/app/insurer/claims' })

    const rows = await screen.findAllByRole('link', { name: /MC-26-/ })
    expect(rows[0]).toHaveTextContent('MC-26-URGENT')
    expect(rows[1]).toHaveTextContent('MC-26-LATER')
  })

  it('asks the API for a breached-only queue when filtered', async () => {
    let requestUrl = ''

    server.use(
      http.get('/api/v1/auth/me', () => HttpResponse.json({ data: agent() })),
      http.get('/api/v1/insurer/claims', ({ request }) => {
        requestUrl = request.url
        return HttpResponse.json(page([]))
      }),
    )

    renderWithProviders(<AppRoutes />, { route: '/app/insurer/claims' })

    await userEvent.click(
      await screen.findByLabelText('المتجاوزة للمهلة فقط'),
    )

    await waitFor(() => expect(requestUrl).toContain('sla_breached=1'))
  })

  it('omits an empty status rather than sending one the enum rejects', async () => {
    let requestUrl = ''

    server.use(
      http.get('/api/v1/auth/me', () => HttpResponse.json({ data: agent() })),
      http.get('/api/v1/insurer/claims', ({ request }) => {
        requestUrl = request.url
        return HttpResponse.json(page([]))
      }),
    )

    renderWithProviders(<AppRoutes />, { route: '/app/insurer/claims' })

    await waitFor(() => expect(requestUrl).not.toBe(''))
    expect(requestUrl).not.toContain('status=')
  })
})

describe('decision panel', () => {
  it('will not submit without a reason code', async () => {
    mockDetail()

    renderWithProviders(<AppRoutes />, { route: '/app/insurer/claims/42' })

    // FR-CL2 — the select has no default, so the button starts disabled.
    const submit = await screen.findByRole('button', { name: 'تسجيل القرار' })
    expect(submit).toBeDisabled()
  })

  it('sends the outcome and reason code together', async () => {
    const user = userEvent.setup()
    let posted: unknown = null

    mockDetail()
    server.use(
      http.post('/api/v1/insurer/claims/42/decide', async ({ request }) => {
        posted = await request.json()
        return HttpResponse.json({ data: claim({ status: 'rejected' }) })
      }),
    )

    renderWithProviders(<AppRoutes />, { route: '/app/insurer/claims/42' })

    await user.selectOptions(await screen.findByLabelText('القرار'), 'reject')
    await user.selectOptions(
      screen.getByLabelText('سبب القرار'),
      'policy_lapsed',
    )
    await user.click(screen.getByRole('button', { name: 'تسجيل القرار' }))

    await waitFor(() =>
      expect(posted).toEqual({
        outcome: 'reject',
        reason_code: 'policy_lapsed',
        note: null,
      }),
    )
  })
})

describe('settlement form', () => {
  it('requires a workshop for a repair order', async () => {
    const user = userEvent.setup()
    mockDetail()

    renderWithProviders(<AppRoutes />, { route: '/app/insurer/claims/42' })

    await user.type(await screen.findByLabelText('المبلغ (ل.س)'), '250000')
    await user.click(screen.getByRole('button', { name: 'تسجيل التسوية' }))

    expect(
      await screen.findByText('اختيار الورشة مطلوب لأمر الإصلاح.'),
    ).toBeInTheDocument()
  })

  it('drops the workshop when the mode is cash', async () => {
    const user = userEvent.setup()
    let posted: unknown = null

    mockDetail()
    server.use(
      http.post('/api/v1/insurer/claims/42/settlement', async ({ request }) => {
        posted = await request.json()
        return HttpResponse.json({ data: {} })
      }),
    )

    renderWithProviders(<AppRoutes />, { route: '/app/insurer/claims/42' })

    await user.selectOptions(
      await screen.findByLabelText('طريقة التسوية'),
      'cash',
    )
    await user.type(screen.getByLabelText('المبلغ (ل.س)'), '250000')
    await user.click(screen.getByRole('button', { name: 'تسجيل التسوية' }))

    await waitFor(() =>
      expect(posted).toEqual({
        mode: 'cash',
        amount: 250000,
        workshop_org_id: null,
      }),
    )
  })

  it('rejects a non-numeric amount before reaching the API', async () => {
    const user = userEvent.setup()
    mockDetail()

    renderWithProviders(<AppRoutes />, { route: '/app/insurer/claims/42' })

    await user.type(await screen.findByLabelText('المبلغ (ل.س)'), 'abc')
    await user.click(screen.getByRole('button', { name: 'تسجيل التسوية' }))

    expect(await screen.findByText('أدخل مبلغاً صحيحاً.')).toBeInTheDocument()
  })

  it('hides the settlement form once a settlement exists', async () => {
    mockDetail(
      agent(),
      claim({
        settlement: { id: 1, mode: 'cash', amount: '250000.00', workshop_org_id: null, settled_at: '2026-07-29T10:00:00.000000Z' },
      }),
    )

    renderWithProviders(<AppRoutes />, { route: '/app/insurer/claims/42' })

    expect(await screen.findByText('التسوية')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'تسجيل التسوية' }),
    ).not.toBeInTheDocument()
  })
})

describe('insurer admin', () => {
  it('reads a claim but is offered no controls', async () => {
    mockDetail(admin())

    renderWithProviders(<AppRoutes />, { route: '/app/insurer/claims/42' })

    expect(await screen.findByText('MC-26-CLAIM1')).toBeInTheDocument()
    // Mirrors the route split — showing buttons that would 403 is worse.
    expect(
      screen.queryByRole('button', { name: 'تسجيل القرار' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'تسجيل التسوية' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByText(
        'لديك صلاحية العرض فقط — إصدار القرار والتسوية من صلاحية موظف المطالبات.',
      ),
    ).toBeInTheDocument()
  })
})

describe('policy verification queue', () => {
  const policy = {
    id: 7,
    vehicle_id: 3,
    insurer_org_id: 1,
    policy_no: 'POL-2026-001',
    type: 'compulsory',
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    verification_status: 'pending' as const,
    verified_at: null,
    document_path: null,
    created_at: '2026-07-01T10:00:00.000000Z',
  }

  it('lets an agent verify a pending policy', async () => {
    const user = userEvent.setup()
    let verified = false

    server.use(
      http.get('/api/v1/auth/me', () => HttpResponse.json({ data: agent() })),
      http.get('/api/v1/insurer/policies', () =>
        HttpResponse.json({
          data: verified ? [] : [policy],
          meta: { current_page: 1, last_page: 1, per_page: 50, total: 1 },
        }),
      ),
      http.post('/api/v1/insurer/policies/7/verify', () => {
        verified = true
        return HttpResponse.json({
          data: { ...policy, verification_status: 'verified' },
        })
      }),
    )

    renderWithProviders(<AppRoutes />, { route: '/app/insurer/policies' })

    await user.click(await screen.findByRole('button', { name: 'تحقّق' }))

    await waitFor(() => expect(verified).toBe(true))
  })

  it('collects a reason before rejecting', async () => {
    const user = userEvent.setup()
    let posted: unknown = null

    server.use(
      http.get('/api/v1/auth/me', () => HttpResponse.json({ data: agent() })),
      http.get('/api/v1/insurer/policies', () =>
        HttpResponse.json({
          data: [policy],
          meta: { current_page: 1, last_page: 1, per_page: 50, total: 1 },
        }),
      ),
      http.post('/api/v1/insurer/policies/7/reject', async ({ request }) => {
        posted = await request.json()
        return HttpResponse.json({
          data: { ...policy, verification_status: 'rejected' },
        })
      }),
    )

    renderWithProviders(<AppRoutes />, { route: '/app/insurer/policies' })

    await user.click(await screen.findByRole('button', { name: 'رفض' }))
    await user.type(
      screen.getByLabelText('سبب الرفض'),
      'رقم الوثيقة غير موجود في سجلاتنا.',
    )
    await user.click(screen.getByRole('button', { name: 'تأكيد الرفض' }))

    await waitFor(() =>
      expect(posted).toEqual({ reason: 'رقم الوثيقة غير موجود في سجلاتنا.' }),
    )
  })

  it('offers an admin no verify or reject buttons', async () => {
    server.use(
      http.get('/api/v1/auth/me', () => HttpResponse.json({ data: admin() })),
      http.get('/api/v1/insurer/policies', () =>
        HttpResponse.json({
          data: [policy],
          meta: { current_page: 1, last_page: 1, per_page: 50, total: 1 },
        }),
      ),
    )

    renderWithProviders(<AppRoutes />, { route: '/app/insurer/policies' })

    expect(await screen.findByText('POL-2026-001')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'تحقّق' }),
    ).not.toBeInTheDocument()
  })
})
