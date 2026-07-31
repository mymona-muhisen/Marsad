import { HttpResponse, http } from 'msw'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { AppRoutes } from '@/routes/AppRoutes'
import { server } from '@/test/server'
import { makeUser, renderWithProviders, signInWithToken } from '@/test/utils'
import type { Claim } from '@/lib/api/types'

const assessor = () => makeUser({ roles: ['assessor'] })

const PRICES = {
  data: [
    {
      id: 1,
      part_code: 'BUMPER_F',
      name_ar: 'مصد أمامي',
      reference_price: '100000.00',
      version: 2,
      effective_from: '2026-01-01',
    },
  ],
}

function claim(overrides: Partial<Claim> = {}): Claim {
  return {
    id: 42,
    case_id: 3,
    case_no: 'MC-26-EST001',
    claimant_party_id: 11,
    insurer_org_id: 1,
    assessor_org_id: 9,
    status: 'assessing',
    sla_due_at: '2026-08-05T10:00:00.000000Z',
    sla_seconds_remaining: 3 * 86400,
    sla_breached: false,
    created_at: '2026-07-30T10:00:00.000000Z',
    events: [],
    estimates: [],
    settlement: null,
    ...overrides,
  }
}

function mockDetail(payload = claim()) {
  server.use(
    http.get('/api/v1/auth/me', () => HttpResponse.json({ data: assessor() })),
    http.get('/api/v1/assessor/claims/42', () =>
      HttpResponse.json({ data: payload }),
    ),
    http.get('/api/v1/assessor/parts-prices', () => HttpResponse.json(PRICES)),
  )
}

beforeEach(() => {
  signInWithToken()
})

describe('assigned claims list', () => {
  it('lists claims this office was put on', async () => {
    server.use(
      http.get('/api/v1/auth/me', () => HttpResponse.json({ data: assessor() })),
      http.get('/api/v1/assessor/claims', () =>
        HttpResponse.json({
          data: [claim()],
          meta: { current_page: 1, last_page: 1, per_page: 50, total: 1 },
        }),
      ),
    )

    renderWithProviders(<AppRoutes />, { route: '/app/estimates' })

    expect(await screen.findByText('MC-26-EST001')).toBeInTheDocument()
  })

  it('says so when nothing is assigned', async () => {
    server.use(
      http.get('/api/v1/auth/me', () => HttpResponse.json({ data: assessor() })),
      http.get('/api/v1/assessor/claims', () =>
        HttpResponse.json({
          data: [],
          meta: { current_page: 1, last_page: 1, per_page: 50, total: 0 },
        }),
      ),
    )

    renderWithProviders(<AppRoutes />, { route: '/app/estimates' })

    expect(
      await screen.findByText('لا توجد مطالبات موكَلة إليك حالياً.'),
    ).toBeInTheDocument()
  })

  it('reports a claim assigned to another office as not found', async () => {
    server.use(
      http.get('/api/v1/auth/me', () => HttpResponse.json({ data: assessor() })),
      http.get('/api/v1/assessor/claims/42', () =>
        HttpResponse.json(
          { message: 'This action is unauthorized.' },
          { status: 403 },
        ),
      ),
    )

    renderWithProviders(<AppRoutes />, { route: '/app/estimates/42' })

    expect(
      await screen.findByText('المطالبة غير موجودة أو لم تُوكَل إلى مكتبك.'),
    ).toBeInTheDocument()
  })
})

describe('the estimate builder', () => {
  it('shows the reference price for the chosen part', async () => {
    const user = userEvent.setup()
    mockDetail()

    renderWithProviders(<AppRoutes />, { route: '/app/estimates/42' })

    // The option only exists once the price list resolves; selecting before
    // then would race the query rather than test the screen.
    await screen.findByRole('option', { name: 'مصد أمامي' })
    await user.selectOptions(
      screen.getByLabelText('القطعة المرجعية'),
      'BUMPER_F',
    )

    // Being judged against a price list you cannot read is what this fixes.
    // findAllByText: the regex matches the paragraph and its wrapper both.
    const shown = await screen.findAllByText(/السعر المرجعي/)
    expect(shown.length).toBeGreaterThan(0)
    expect(shown[0]).toHaveTextContent('100,000')
  })

  it('warns before submitting that a line will be flagged', async () => {
    const user = userEvent.setup()
    mockDetail()

    renderWithProviders(<AppRoutes />, { route: '/app/estimates/42' })

    await screen.findByRole('option', { name: 'مصد أمامي' })
    await user.selectOptions(
      screen.getByLabelText('القطعة المرجعية'),
      'BUMPER_F',
    )
    await user.type(screen.getByLabelText('سعر الوحدة (ل.س)'), '200000')

    expect(
      await screen.findByText(/سيُعلَّم البند للمراجعة/),
    ).toBeInTheDocument()
  })

  it('refuses an incomplete line rather than letting the API reject it', async () => {
    const user = userEvent.setup()
    mockDetail()

    renderWithProviders(<AppRoutes />, { route: '/app/estimates/42' })

    await user.click(
      await screen.findByRole('button', { name: 'تقديم التقدير' }),
    )

    expect(
      await screen.findByText('أكمل وصف البند وسعره.'),
    ).toBeInTheDocument()
  })

  it('sends the lines without a total, which the server recomputes', async () => {
    const user = userEvent.setup()
    let posted: unknown = null

    mockDetail()
    server.use(
      http.post('/api/v1/claims/42/estimates', async ({ request }) => {
        posted = await request.json()
        return HttpResponse.json({ data: { id: 1 } }, { status: 201 })
      }),
    )

    renderWithProviders(<AppRoutes />, { route: '/app/estimates/42' })

    await user.type(await screen.findByLabelText('البند'), 'مصد أمامي')
    await screen.findByRole('option', { name: 'مصد أمامي' })
    await user.selectOptions(screen.getByLabelText('القطعة المرجعية'), 'BUMPER_F')
    await user.clear(screen.getByLabelText('الكمية'))
    await user.type(screen.getByLabelText('الكمية'), '2')
    await user.type(screen.getByLabelText('سعر الوحدة (ل.س)'), '100000')

    await user.click(screen.getByRole('button', { name: 'تقديم التقدير' }))

    await waitFor(() =>
      expect(posted).toEqual({
        type: 'assessor',
        items: [
          {
            description: 'مصد أمامي',
            part_code: 'BUMPER_F',
            qty: 2,
            unit_price: 100000,
            labor_hours: null,
          },
        ],
      }),
    )
  })

  it('adds and removes lines', async () => {
    const user = userEvent.setup()
    mockDetail()

    renderWithProviders(<AppRoutes />, { route: '/app/estimates/42' })

    await user.click(await screen.findByRole('button', { name: /إضافة بند/ }))
    expect(screen.getAllByLabelText('البند')).toHaveLength(2)

    await user.click(screen.getAllByRole('button', { name: 'حذف البند' })[0])
    expect(screen.getAllByLabelText('البند')).toHaveLength(1)
  })

  it('surfaces a server refusal instead of pretending it worked', async () => {
    const user = userEvent.setup()
    mockDetail()
    server.use(
      http.post('/api/v1/claims/42/estimates', () =>
        HttpResponse.json(
          { message: 'This action is unauthorized.' },
          { status: 403 },
        ),
      ),
    )

    renderWithProviders(<AppRoutes />, { route: '/app/estimates/42' })

    await user.type(await screen.findByLabelText('البند'), 'مصد أمامي')
    await user.type(screen.getByLabelText('سعر الوحدة (ل.س)'), '100000')
    await user.click(screen.getByRole('button', { name: 'تقديم التقدير' }))

    expect(
      await screen.findByText('This action is unauthorized.'),
    ).toBeInTheDocument()
  })
})

describe('role isolation', () => {
  it('keeps a citizen out of the estimates screen', async () => {
    server.use(
      http.get('/api/v1/auth/me', () => HttpResponse.json({ data: makeUser() })),
    )

    renderWithProviders(<AppRoutes />, { route: '/app/estimates' })

    await waitFor(() =>
      expect(
        screen.queryByText('التقديرات المُوكَلة إليّ'),
      ).not.toBeInTheDocument(),
    )
  })
})
