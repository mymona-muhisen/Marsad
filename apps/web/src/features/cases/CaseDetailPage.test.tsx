import { HttpResponse, http } from 'msw'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { AppRoutes } from '@/routes/AppRoutes'
import { server } from '@/test/server'
import { makeUser, renderWithProviders, signInWithToken } from '@/test/utils'
import type { AccidentCase } from '@/lib/api/types'

const CASE_NO = 'MC-26-ABC123'

function baseCase(overrides: Partial<AccidentCase> = {}): AccidentCase {
  return {
    case_no: CASE_NO,
    status: 'objection_window',
    track: 'fast_track',
    channel: 'self',
    occurred_at: '2026-07-20T09:30:00.000000Z',
    lat: 33.5138,
    lng: 36.2765,
    location_verified: false,
    location_description: 'أوتوستراد المزة، مقابل مشفى الشامي',
    region: 'دمشق',
    injury_flag: false,
    police_report_ref: null,
    one_sided_flag: false,
    created_at: '2026-07-20T09:45:00.000000Z',
    parties: [
      {
        id: 11,
        role: 'reporter',
        user_id: 1,
        vehicle_id: 7,
        policy_id: null,
        unregistered_plate: null,
        statement_text: 'اصطدمت بي المركبة من الخلف.',
        joined_at: '2026-07-20T09:45:00.000000Z',
        evidence: [
          {
            id: 501,
            party_id: 11,
            type: 'photo',
            file_path: 'evidence/a.jpg',
            sha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
            lat: 33.5138,
            lng: 36.2765,
            captured_at: '2026-07-20T09:35:00.000000Z',
            superseded_by: null,
          },
        ],
      },
    ],
    ...overrides,
  }
}

const DECISION = {
  id: 90,
  case_id: 3,
  rule_id: 5,
  scenario_code: 'REAR_END',
  rule_description_ar: 'الاصطدام من الخلف: المسؤولية كاملة على المركبة الخلفية.',
  status: 'confirmed',
  was_overridden: false,
  justification: 'الأدلة تؤكد أن المركبة الخلفية لم تترك مسافة أمان.',
  decided_at: '2026-07-21T10:00:00.000000Z',
  objection_window_hours: 72,
  objection_deadline: '2026-07-24T10:00:00.000000Z',
  objection_seconds_remaining: 70 * 3600,
  allocations: [
    { party_id: 11, percentage: 25 },
    { party_id: 12, percentage: 75 },
  ],
  objections: [],
}

function mockCase(payload: AccidentCase) {
  server.use(
    http.get('/api/v1/auth/me', () => HttpResponse.json({ data: makeUser() })),
    http.get(`/api/v1/cases/${CASE_NO}`, () =>
      HttpResponse.json({ data: payload }),
    ),
    http.get('/api/v1/evidence/:id/download-url', () =>
      HttpResponse.json({
        data: { url: 'https://example.test/signed.jpg', expires_in_minutes: 30 },
      }),
    ),
  )
}

beforeEach(() => {
  signInWithToken()
})

describe('CaseDetailPage', () => {
  it('shows the case number and a translated status chip', async () => {
    mockCase(baseCase())

    renderWithProviders(<AppRoutes />, { route: `/app/cases/${CASE_NO}` })

    expect(await screen.findByText(CASE_NO)).toBeInTheDocument()
    expect(screen.getByText('مهلة الاعتراض')).toBeInTheDocument()
  })

  it('shows the written location rather than raw coordinates', async () => {
    mockCase(baseCase())

    renderWithProviders(<AppRoutes />, { route: `/app/cases/${CASE_NO}` })

    expect(
      await screen.findByText(/أوتوستراد المزة، مقابل مشفى الشامي/),
    ).toBeInTheDocument()
  })

  it('cites the liability rule in plain Arabic beside the percentages', async () => {
    mockCase(baseCase({ fault_decision: DECISION }))

    renderWithProviders(<AppRoutes />, { route: `/app/cases/${CASE_NO}` })

    // FR-F2 — the reason, not just the number.
    expect(
      await screen.findByText(
        'الاصطدام من الخلف: المسؤولية كاملة على المركبة الخلفية.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('25%')).toBeInTheDocument()
    expect(screen.getByText('75%')).toBeInTheDocument()
    // The signed-in user is party 11, so 25% is labelled as theirs.
    expect(screen.getByText('نسبتك')).toBeInTheDocument()
  })

  it('says no decision has been issued when there is none', async () => {
    mockCase(baseCase({ status: 'submitted', fault_decision: null }))

    renderWithProviders(<AppRoutes />, { route: `/app/cases/${CASE_NO}` })

    expect(
      await screen.findByText('لم يصدر قرار المسؤولية بعد.'),
    ).toBeInTheDocument()
  })

  it('shows the objection window counting down from the server figure', async () => {
    mockCase(baseCase({ fault_decision: DECISION }))

    renderWithProviders(<AppRoutes />, { route: `/app/cases/${CASE_NO}` })

    // 70h remaining, rendered as hours and minutes.
    expect(await screen.findByText(/70 ساعة/)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'تقديم اعتراض' }),
    ).toBeInTheDocument()
  })

  it('closes the objection form once the window has expired', async () => {
    mockCase(
      baseCase({
        fault_decision: { ...DECISION, objection_seconds_remaining: 0 },
      }),
    )

    renderWithProviders(<AppRoutes />, { route: `/app/cases/${CASE_NO}` })

    expect(
      await screen.findByText('انتهت مهلة الاعتراض.'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'تقديم اعتراض' }),
    ).not.toBeInTheDocument()
  })

  it('refuses to submit an empty objection', async () => {
    const user = userEvent.setup()
    mockCase(baseCase({ fault_decision: DECISION }))

    renderWithProviders(<AppRoutes />, { route: `/app/cases/${CASE_NO}` })

    await user.click(await screen.findByRole('button', { name: 'تقديم اعتراض' }))

    // No POST handler registered — reaching the network would fail the test.
    expect(await screen.findByText('اكتب سبب اعتراضك.')).toBeInTheDocument()
  })

  it('submits an objection and re-reads the case', async () => {
    const user = userEvent.setup()
    let posted: unknown = null
    let objected = false

    server.use(
      http.get('/api/v1/auth/me', () => HttpResponse.json({ data: makeUser() })),
      http.get('/api/v1/evidence/:id/download-url', () =>
        HttpResponse.json({
          data: { url: 'https://example.test/s.jpg', expires_in_minutes: 30 },
        }),
      ),
      http.get(`/api/v1/cases/${CASE_NO}`, () =>
        HttpResponse.json({
          data: baseCase({
            fault_decision: {
              ...DECISION,
              objections: objected
                ? [
                    {
                      id: 1,
                      decision_id: 90,
                      party_id: 11,
                      reason: 'كنت أملك حق الأولوية.',
                      status: 'open' as const,
                      resolution_note: null,
                      resolved_at: null,
                    },
                  ]
                : [],
            },
          }),
        }),
      ),
      http.post(`/api/v1/cases/${CASE_NO}/objections`, async ({ request }) => {
        posted = await request.json()
        objected = true
        return HttpResponse.json({ data: { id: 1 } }, { status: 201 })
      }),
    )

    renderWithProviders(<AppRoutes />, { route: `/app/cases/${CASE_NO}` })

    await user.type(
      await screen.findByLabelText('سبب الاعتراض'),
      'كنت أملك حق الأولوية.',
    )
    await user.click(screen.getByRole('button', { name: 'تقديم اعتراض' }))

    await waitFor(() =>
      expect(posted).toEqual({ reason: 'كنت أملك حق الأولوية.' }),
    )
    // The refetched case shows the filed objection instead of the form.
    expect(
      await screen.findByText('قدّمت اعتراضاً على هذا القرار.'),
    ).toBeInTheDocument()
  })

  it('surfaces the server’s message when the window closed server-side', async () => {
    const user = userEvent.setup()
    mockCase(baseCase({ fault_decision: DECISION }))
    server.use(
      http.post(`/api/v1/cases/${CASE_NO}/objections`, () =>
        HttpResponse.json(
          {
            message: 'انتهت مهلة الاعتراض (72 ساعة).',
            errors: { reason: ['انتهت مهلة الاعتراض (72 ساعة).'] },
          },
          { status: 422 },
        ),
      ),
    )

    renderWithProviders(<AppRoutes />, { route: `/app/cases/${CASE_NO}` })

    await user.type(await screen.findByLabelText('سبب الاعتراض'), 'اعتراض متأخر')
    await user.click(screen.getByRole('button', { name: 'تقديم اعتراض' }))

    expect(
      await screen.findByText('انتهت مهلة الاعتراض (72 ساعة).'),
    ).toBeInTheDocument()
  })

  it('loads evidence through a signed URL and shows the hash', async () => {
    mockCase(baseCase())

    const { container } = renderWithProviders(<AppRoutes />, {
      route: `/app/cases/${CASE_NO}`,
    })

    await waitFor(() => {
      const image = container.querySelector('img[src^="https://example.test"]')
      expect(image).not.toBeNull()
    })

    // Tamper-evidence made visible, not merely claimed.
    expect(screen.getByText(/a1b2c3d4e5f60718/)).toBeInTheDocument()
  })

  it('reports a case the user may not see as not found', async () => {
    server.use(
      http.get('/api/v1/auth/me', () => HttpResponse.json({ data: makeUser() })),
      http.get(`/api/v1/cases/${CASE_NO}`, () =>
        HttpResponse.json({ message: 'This action is unauthorized.' }, { status: 403 }),
      ),
    )

    renderWithProviders(<AppRoutes />, { route: `/app/cases/${CASE_NO}` })

    expect(
      await screen.findByText('القضية غير موجودة أو لا تملك صلاحية عرضها.'),
    ).toBeInTheDocument()
  })
})
