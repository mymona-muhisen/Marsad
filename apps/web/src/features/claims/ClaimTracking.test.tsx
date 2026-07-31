import { HttpResponse, http } from 'msw'
import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { AppRoutes } from '@/routes/AppRoutes'
import { server } from '@/test/server'
import { makeUser, renderWithProviders, signInWithToken } from '@/test/utils'
import type { Claim } from '@/lib/api/types'

const HOUR = 3600

function makeClaim(overrides: Partial<Claim> = {}): Claim {
  return {
    id: 42,
    case_id: 3,
    case_no: 'MC-26-ABC123',
    claimant_party_id: 11,
    insurer_org_id: 2,
    assessor_org_id: null,
    status: 'assessing',
    sla_due_at: '2026-08-03T09:00:00.000000Z',
    sla_seconds_remaining: 30 * HOUR,
    sla_breached: false,
    created_at: '2026-07-29T09:00:00.000000Z',
    ...overrides,
  }
}

function page(claims: Claim[]) {
  return {
    data: claims,
    meta: { current_page: 1, last_page: 1, per_page: 50, total: claims.length },
  }
}

beforeEach(() => {
  signInWithToken()
  server.use(
    http.get('/api/v1/auth/me', () => HttpResponse.json({ data: makeUser() })),
  )
})

describe('ClaimsPage', () => {
  it('lists a claim with its case number, status and remaining SLA', async () => {
    server.use(
      http.get('/api/v1/claims', () => HttpResponse.json(page([makeClaim()]))),
    )

    renderWithProviders(<AppRoutes />, { route: '/app/claims' })

    expect(await screen.findByText('MC-26-ABC123')).toBeInTheDocument()
    expect(screen.getByText('قيد التقدير')).toBeInTheDocument()
    // 30h left renders as 1 day and 6 hours.
    expect(screen.getByText(/يتبقّى 1 يوم و 6 ساعة/)).toBeInTheDocument()
  })

  it('explains how claims come into existence when there are none', async () => {
    server.use(http.get('/api/v1/claims', () => HttpResponse.json(page([]))))

    renderWithProviders(<AppRoutes />, { route: '/app/claims' })

    expect(await screen.findByText(/تُفتح المطالبة تلقائياً/)).toBeInTheDocument()
  })

  it('calls out an insurer that is past the binding deadline', async () => {
    server.use(
      http.get('/api/v1/claims', () =>
        HttpResponse.json(
          page([
            makeClaim({
              sla_seconds_remaining: -2 * 24 * HOUR,
              sla_breached: true,
            }),
          ]),
        ),
      ),
    )

    renderWithProviders(<AppRoutes />, { route: '/app/claims' })

    expect(
      await screen.findByText(/تجاوزت شركة التأمين الموعد الملزم بـ 2 يوم/),
    ).toBeInTheDocument()
  })

  it('does not call a settled claim overdue even when past its deadline', async () => {
    server.use(
      http.get('/api/v1/claims', () =>
        HttpResponse.json(
          page([
            makeClaim({
              status: 'settled',
              sla_seconds_remaining: -5 * 24 * HOUR,
              sla_breached: false,
            }),
          ]),
        ),
      ),
    )

    renderWithProviders(<AppRoutes />, { route: '/app/claims' })

    expect(
      await screen.findByText('تمّ الردّ ضمن الموعد الملزم.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/تجاوزت شركة التأمين/)).not.toBeInTheDocument()
  })
})

describe('ClaimDetailPage', () => {
  function mockClaim(claim: Claim) {
    server.use(
      http.get('/api/v1/claims/42', () => HttpResponse.json({ data: claim })),
    )
  }

  it('renders the event log with the insurer’s mandatory reason code', async () => {
    mockClaim(
      makeClaim({
        events: [
          {
            id: 1,
            actor_id: null,
            action: 'opened',
            reason_code: null,
            note: null,
            created_at: '2026-07-29T09:00:00.000000Z',
          },
          {
            id: 2,
            actor_id: 9,
            action: 'decided',
            reason_code: 'coverage_limit',
            note: 'المبلغ المعتمد ضمن سقف الوثيقة.',
            created_at: '2026-07-30T11:00:00.000000Z',
          },
        ],
      }),
    )

    renderWithProviders(<AppRoutes />, { route: '/app/claims/42' })

    expect(
      await screen.findByText('فُتحت المطالبة لدى شركة التأمين'),
    ).toBeInTheDocument()
    expect(screen.getByText('أصدرت شركة التأمين قرارها')).toBeInTheDocument()
    expect(screen.getByText('بلغت سقف التغطية')).toBeInTheDocument()
    expect(
      screen.getByText('المبلغ المعتمد ضمن سقف الوثيقة.'),
    ).toBeInTheDocument()
  })

  it('falls back to the raw reason code if the API adds one we have no translation for', async () => {
    mockClaim(
      makeClaim({
        events: [
          {
            id: 3,
            actor_id: 9,
            action: 'decided',
            reason_code: 'brand_new_code',
            note: null,
            created_at: '2026-07-30T11:00:00.000000Z',
          },
        ],
      }),
    )

    renderWithProviders(<AppRoutes />, { route: '/app/claims/42' })

    // Better a raw code than a missing-key placeholder in front of a claimant.
    expect(await screen.findByText('brand_new_code')).toBeInTheDocument()
  })

  it('flags an estimate line that exceeds the reference price list', async () => {
    mockClaim(
      makeClaim({
        estimates: [
          {
            id: 7,
            claim_id: 42,
            type: 'workshop',
            status: 'submitted',
            total: '1500000.00',
            created_at: '2026-07-30T08:00:00.000000Z',
            items: [
              {
                id: 71,
                part_price_id: 4,
                description: 'مصد أمامي',
                qty: 1,
                unit_price: '900000.00',
                labor_hours: '2.00',
                line_total: '900000.00',
                deviation_flag: true,
              },
              {
                id: 72,
                part_price_id: 5,
                description: 'مصباح أمامي',
                qty: 2,
                unit_price: '300000.00',
                labor_hours: null,
                line_total: '600000.00',
                deviation_flag: false,
              },
            ],
          },
        ],
      }),
    )

    renderWithProviders(<AppRoutes />, { route: '/app/claims/42' })

    expect(await screen.findByText('مصد أمامي')).toBeInTheDocument()
    // FR-CL3 — exactly one line is flagged.
    expect(
      screen.getAllByText('سعر يتجاوز القائمة المرجعية'),
    ).toHaveLength(1)
  })

  it('shows the settlement mode and amount once settled', async () => {
    mockClaim(
      makeClaim({
        status: 'settled',
        sla_seconds_remaining: -HOUR,
        settlement: {
          id: 5,
          mode: 'cash',
          amount: '1350000.00',
          workshop_org_id: null,
          settled_at: '2026-08-01T12:00:00.000000Z',
        },
      }),
    )

    renderWithProviders(<AppRoutes />, { route: '/app/claims/42' })

    expect(await screen.findByText('تعويض نقدي')).toBeInTheDocument()
    expect(screen.getByText(/1,350,000/)).toBeInTheDocument()
  })

  it('links back to the case the claim came from', async () => {
    mockClaim(makeClaim())

    renderWithProviders(<AppRoutes />, { route: '/app/claims/42' })

    const link = await screen.findByRole('link', { name: /عرض القضية/ })
    expect(link).toHaveAttribute('href', '/app/cases/MC-26-ABC123')
  })

  it('reports a claim the user may not see as not found', async () => {
    server.use(
      http.get('/api/v1/claims/42', () =>
        HttpResponse.json(
          { message: 'This action is unauthorized.' },
          { status: 403 },
        ),
      ),
    )

    renderWithProviders(<AppRoutes />, { route: '/app/claims/42' })

    expect(
      await screen.findByText('المطالبة غير موجودة أو لا تملك صلاحية عرضها.'),
    ).toBeInTheDocument()
  })
})
