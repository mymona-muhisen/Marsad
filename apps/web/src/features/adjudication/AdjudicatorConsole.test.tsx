import { HttpResponse, http } from 'msw'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { AppRoutes } from '@/routes/AppRoutes'
import { server } from '@/test/server'
import { makeUser, renderWithProviders, signInWithToken } from '@/test/utils'
import type { AccidentCase } from '@/lib/api/types'

const CASE_NO = 'MC-26-QUEUE1'

const adjudicator = () => makeUser({ roles: ['adjudicator'] })

const RULES = {
  data: [
    {
      id: 1,
      scenario_code: 'REAR_END',
      description_ar: 'اصطدام خلفي: المسؤولية كاملة على المركبة الخلفية.',
      fault_split_a: 100,
      fault_split_b: 0,
      version: 2,
      effective_from: '2026-01-01',
    },
  ],
}

function reviewCase(overrides: Partial<AccidentCase> = {}): AccidentCase {
  return {
    case_no: CASE_NO,
    status: 'evidence_complete',
    track: 'fast_track',
    channel: 'self',
    occurred_at: '2026-07-20T09:30:00.000000Z',
    lat: 33.5138,
    lng: 36.2765,
    location_verified: false,
    region: 'دمشق',
    injury_flag: false,
    police_report_ref: null,
    one_sided_flag: false,
    created_at: '2026-07-20T09:45:00.000000Z',
    parties: [
      {
        id: 11,
        role: 'reporter',
        user_id: 5,
        vehicle_id: 7,
        policy_id: null,
        unregistered_plate: null,
        statement_text: 'كنت أسير في مساري حين صدمتني المركبة من الخلف.',
        joined_at: '2026-07-20T09:45:00.000000Z',
        evidence: [],
      },
      {
        id: 12,
        role: 'counterparty',
        user_id: 6,
        vehicle_id: 8,
        policy_id: null,
        unregistered_plate: null,
        statement_text: 'توقّفت المركبة أمامي فجأة.',
        joined_at: '2026-07-21T10:00:00.000000Z',
        evidence: [],
      },
    ],
    ...overrides,
  }
}

function mockConsole(payload = reviewCase()) {
  server.use(
    http.get('/api/v1/auth/me', () =>
      HttpResponse.json({ data: adjudicator() }),
    ),
    http.get('/api/v1/liability-rules', () => HttpResponse.json(RULES)),
    http.get(`/api/v1/cases/${CASE_NO}`, () =>
      HttpResponse.json({ data: payload }),
    ),
  )
}

beforeEach(() => {
  signInWithToken()
})

describe('adjudication queue', () => {
  it('lists waiting cases with how many statements are in', async () => {
    server.use(
      http.get('/api/v1/auth/me', () =>
        HttpResponse.json({ data: adjudicator() }),
      ),
      http.get('/api/v1/adjudication/queue', () =>
        HttpResponse.json({
          data: [reviewCase()],
          meta: { current_page: 1, last_page: 1, per_page: 50, total: 1 },
        }),
      ),
    )

    renderWithProviders(<AppRoutes />, { route: '/app/adjudication/queue' })

    expect(await screen.findByText(CASE_NO)).toBeInTheDocument()
    expect(screen.getByText('2 طرف')).toBeInTheDocument()
    expect(screen.getByText('2 إفادة')).toBeInTheDocument()
  })

  it('says so when nothing is waiting', async () => {
    server.use(
      http.get('/api/v1/auth/me', () =>
        HttpResponse.json({ data: adjudicator() }),
      ),
      http.get('/api/v1/adjudication/queue', () =>
        HttpResponse.json({
          data: [],
          meta: { current_page: 1, last_page: 1, per_page: 50, total: 0 },
        }),
      ),
    )

    renderWithProviders(<AppRoutes />, { route: '/app/adjudication/queue' })

    expect(
      await screen.findByText('لا توجد قضايا بانتظار المراجعة.'),
    ).toBeInTheDocument()
  })
})

describe('review screen', () => {
  it('shows both statements side by side', async () => {
    mockConsole()

    renderWithProviders(<AppRoutes />, {
      route: `/app/adjudication/cases/${CASE_NO}`,
    })

    expect(
      await screen.findByText(/صدمتني المركبة من الخلف/),
    ).toBeInTheDocument()
    expect(screen.getByText(/توقّفت المركبة أمامي فجأة/)).toBeInTheDocument()
  })

  it('is explicit that it does not analyse the statements', async () => {
    mockConsole()

    renderWithProviders(<AppRoutes />, {
      route: `/app/adjudication/cases/${CASE_NO}`,
    })

    // No fabricated contradiction detection is claimed anywhere.
    expect(
      await screen.findByText(/المنصّة لا تحلّل النصّ آلياً/),
    ).toBeInTheDocument()
  })

  it('blocks submission until the split totals 100', async () => {
    const user = userEvent.setup()
    mockConsole()

    renderWithProviders(<AppRoutes />, {
      route: `/app/adjudication/cases/${CASE_NO}`,
    })

    const submit = await screen.findByRole('button', { name: 'إصدار القرار' })
    expect(submit).toBeDisabled()
    expect(screen.getByText('يجب أن يساوي المجموع 100 بالضبط.')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('القاعدة المنطبقة'), 'REAR_END')
    await user.click(screen.getByRole('button', { name: 'تطبيق الاقتراح' }))

    await waitFor(() => expect(submit).toBeEnabled())
  })

  it('demands a justification when the reviewer departs from the rule', async () => {
    const user = userEvent.setup()
    mockConsole()

    renderWithProviders(<AppRoutes />, {
      route: `/app/adjudication/cases/${CASE_NO}`,
    })

    await user.selectOptions(
      await screen.findByLabelText('القاعدة المنطبقة'),
      'REAR_END',
    )
    await user.click(screen.getByRole('button', { name: 'تطبيق الاقتراح' }))

    // Move off the proposal: 100/0 becomes 60/40.
    const reporterInput = screen.getByLabelText('الطرف المُبلِّغ')
    await user.clear(reporterInput)
    await user.type(reporterInput, '60')
    const counterpartyInput = screen.getByLabelText('الطرف الآخر')
    await user.clear(counterpartyInput)
    await user.type(counterpartyInput, '40')

    expect(
      await screen.findByText('النسب تخالف اقتراح القاعدة — التبرير مطلوب.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'إصدار القرار' })).toBeDisabled()
  })

  it('sends the decision and returns to the queue', async () => {
    const user = userEvent.setup()
    let posted: unknown = null

    mockConsole()
    server.use(
      http.get('/api/v1/adjudication/queue', () =>
        HttpResponse.json({
          data: [],
          meta: { current_page: 1, last_page: 1, per_page: 50, total: 0 },
        }),
      ),
      http.post(`/api/v1/adjudication/cases/${CASE_NO}/decide`, async ({ request }) => {
        posted = await request.json()
        return HttpResponse.json({ data: { id: 1 } }, { status: 201 })
      }),
    )

    renderWithProviders(<AppRoutes />, {
      route: `/app/adjudication/cases/${CASE_NO}`,
    })

    await user.selectOptions(
      await screen.findByLabelText('القاعدة المنطبقة'),
      'REAR_END',
    )
    await user.click(screen.getByRole('button', { name: 'تطبيق الاقتراح' }))
    await user.click(screen.getByRole('button', { name: 'إصدار القرار' }))

    await waitFor(() =>
      expect(posted).toEqual({
        scenario_code: 'REAR_END',
        allocations: [
          { party_id: 11, percentage: 0 },
          { party_id: 12, percentage: 100 },
        ],
        justification: null,
      }),
    )

    // Landed back on the queue.
    expect(
      await screen.findByText('لا توجد قضايا بانتظار المراجعة.'),
    ).toBeInTheDocument()
  })

  it('surfaces a server rejection instead of pretending it succeeded', async () => {
    const user = userEvent.setup()
    mockConsole()
    server.use(
      http.post(`/api/v1/adjudication/cases/${CASE_NO}/decide`, () =>
        HttpResponse.json(
          { message: 'تم اتخاذ قرار مسبق لهذا الملف.' },
          { status: 422 },
        ),
      ),
    )

    renderWithProviders(<AppRoutes />, {
      route: `/app/adjudication/cases/${CASE_NO}`,
    })

    await user.selectOptions(
      await screen.findByLabelText('القاعدة المنطبقة'),
      'REAR_END',
    )
    await user.click(screen.getByRole('button', { name: 'تطبيق الاقتراح' }))
    await user.click(screen.getByRole('button', { name: 'إصدار القرار' }))

    expect(
      await screen.findByText('تم اتخاذ قرار مسبق لهذا الملف.'),
    ).toBeInTheDocument()
  })

  it('keeps a citizen out of the review screen', async () => {
    server.use(
      http.get('/api/v1/auth/me', () => HttpResponse.json({ data: makeUser() })),
    )

    renderWithProviders(<AppRoutes />, {
      route: `/app/adjudication/cases/${CASE_NO}`,
    })

    // RequireRole redirects; the review heading never renders.
    await waitFor(() =>
      expect(screen.queryByText('القرار')).not.toBeInTheDocument(),
    )
  })
})
