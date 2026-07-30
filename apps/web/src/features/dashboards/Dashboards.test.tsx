import { HttpResponse, http } from 'msw'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { AppRoutes } from '@/routes/AppRoutes'
import { server } from '@/test/server'
import { makeUser, renderWithProviders, signInWithToken } from '@/test/utils'

const regulator = () => makeUser({ roles: ['regulator'] })
const authority = () => makeUser({ roles: ['authority'] })

beforeEach(() => {
  signInWithToken()
})

describe('regulator SLA compliance', () => {
  const rows = [
    {
      insurer_org_id: 1,
      insurer_name: 'الشركة السورية للتأمين',
      claims_count: 10,
      breached_count: 1,
      average_settlement_hours: 40,
    },
    {
      insurer_org_id: 2,
      insurer_name: 'شركة العقيلة للتأمين',
      claims_count: 4,
      breached_count: 3,
      average_settlement_hours: null,
    },
  ]

  function mockSla(data = rows) {
    server.use(
      http.get('/api/v1/auth/me', () =>
        HttpResponse.json({ data: regulator() }),
      ),
      http.get('/api/v1/regulator/sla-report', () =>
        HttpResponse.json({ data }),
      ),
    )
  }

  /** Reads a KPI value out of its own tile — "4" also appears in the table. */
  const tileValue = async (label: string) => {
    const tile = (await screen.findByText(label)).closest('div')
    expect(tile).not.toBeNull()
    return tile as HTMLElement
  }

  it('sums the KPI row across insurers', async () => {
    mockSla()

    renderWithProviders(<AppRoutes />, { route: '/app/regulator/sla' })

    // 14 claims, 4 breached, 29% — computed here, not echoed from the API.
    expect(
      within(await tileValue('إجمالي المطالبات')).getByText('14'),
    ).toBeInTheDocument()
    expect(
      within(await tileValue('متجاوزة للمهلة')).getByText('4'),
    ).toBeInTheDocument()
    expect(
      within(await tileValue('نسبة التجاوز')).getByText('29%'),
    ).toBeInTheDocument()
  })

  it('ranks the worst breach rate first, not the largest insurer', async () => {
    mockSla()

    renderWithProviders(<AppRoutes />, { route: '/app/regulator/sla' })

    // Scoped to the chart section; the table below repeats the same names.
    const chart = (
      await screen.findByRole('heading', {
        name: 'نسبة تجاوز المهلة لكل شركة',
      })
    ).closest('section') as HTMLElement

    const labels = within(chart)
      .getAllByText(/للتأمين/)
      .map((node) => node.textContent)

    // 75% (3 of 4) outranks 10% (1 of 10).
    expect(labels[0]).toBe('شركة العقيلة للتأمين')
  })

  it('flags only the worst offender, and only when it has breaches', async () => {
    mockSla()

    renderWithProviders(<AppRoutes />, { route: '/app/regulator/sla' })

    expect(await screen.findAllByText('الأعلى تجاوزاً')).toHaveLength(1)
  })

  it('does not flag anyone when no one has breached', async () => {
    mockSla([{ ...rows[0], breached_count: 0 }, { ...rows[1], breached_count: 0 }])

    renderWithProviders(<AppRoutes />, { route: '/app/regulator/sla' })

    await screen.findByText('التزام شركات التأمين بالمواعيد')
    // A red bar on a compliant company would be a lie told by colour.
    expect(screen.queryByText('الأعلى تجاوزاً')).not.toBeInTheDocument()
  })

  it('says so rather than showing 0 when nothing has settled', async () => {
    mockSla([{ ...rows[1] }])

    renderWithProviders(<AppRoutes />, { route: '/app/regulator/sla' })

    expect(await screen.findByText('لا تسويات بعد')).toBeInTheDocument()
  })

  it('offers a table view of the same numbers', async () => {
    mockSla()

    renderWithProviders(<AppRoutes />, { route: '/app/regulator/sla' })

    expect(await screen.findByText('عرض كجدول')).toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
  })
})

describe('regulator fraud signals', () => {
  const summary = {
    total: 5,
    by_reason: [{ reason: 'duplicate_photo_hash', count: 5 }],
    daily_counts: [
      { date: '2026-07-20', count: 2 },
      { date: '2026-07-21', count: 3 },
    ],
  }

  function mockFraud() {
    server.use(
      http.get('/api/v1/auth/me', () =>
        HttpResponse.json({ data: regulator() }),
      ),
      http.get('/api/v1/regulator/fraud-flags', () =>
        HttpResponse.json({ data: summary }),
      ),
    )
  }

  it('translates the reason code', async () => {
    mockFraud()

    renderWithProviders(<AppRoutes />, { route: '/app/regulator/fraud-flags' })

    expect(
      await screen.findByText('تكرار بصمة صورة عبر قضايا مختلفة'),
    ).toBeInTheDocument()
  })

  it('falls back to the raw code for an unmapped reason', async () => {
    server.use(
      http.get('/api/v1/auth/me', () =>
        HttpResponse.json({ data: regulator() }),
      ),
      http.get('/api/v1/regulator/fraud-flags', () =>
        HttpResponse.json({
          data: { ...summary, by_reason: [{ reason: 'impossible_geometry', count: 2 }] },
        }),
      ),
    )

    renderWithProviders(<AppRoutes />, { route: '/app/regulator/fraud-flags' })

    // A new server-side enum must not render a missing-key placeholder.
    expect(await screen.findByText('impossible_geometry')).toBeInTheDocument()
  })

  it('asks the API for the chosen window', async () => {
    let requestUrl = ''

    server.use(
      http.get('/api/v1/auth/me', () =>
        HttpResponse.json({ data: regulator() }),
      ),
      http.get('/api/v1/regulator/fraud-flags', ({ request }) => {
        requestUrl = request.url
        return HttpResponse.json({ data: summary })
      }),
    )

    renderWithProviders(<AppRoutes />, { route: '/app/regulator/fraud-flags' })

    await userEvent.selectOptions(
      await screen.findByLabelText('المدة'),
      '7',
    )

    await waitFor(() => expect(requestUrl).toContain('days=7'))
  })

  it('exposes each day of the trend to assistive tech', async () => {
    mockFraud()

    renderWithProviders(<AppRoutes />, { route: '/app/regulator/fraud-flags' })

    // The hover layer is also the keyboard/screen-reader path to the values.
    expect(
      await screen.findByRole('button', { name: '2026-07-21: 3' }),
    ).toBeInTheDocument()
  })
})

describe('authority analytics', () => {
  const buckets = [
    { lat: 33.51, lng: 36.27, count: 9 },
    { lat: 36.2, lng: 37.13, count: 2 },
  ]

  it('is explicit that the density plot is not a map', async () => {
    server.use(
      http.get('/api/v1/auth/me', () =>
        HttpResponse.json({ data: authority() }),
      ),
      http.get('/api/v1/authority/heatmap', () =>
        HttpResponse.json({ data: buckets }),
      ),
    )

    renderWithProviders(<AppRoutes />, { route: '/app/authority/heatmap' })

    expect(
      await screen.findByText(/هذا مخطط كثافة لا خريطة/),
    ).toBeInTheDocument()
  })

  it('survives a single bucket without dividing by zero', async () => {
    server.use(
      http.get('/api/v1/auth/me', () =>
        HttpResponse.json({ data: authority() }),
      ),
      http.get('/api/v1/authority/heatmap', () =>
        HttpResponse.json({ data: [buckets[0]] }),
      ),
    )

    renderWithProviders(<AppRoutes />, { route: '/app/authority/heatmap' })

    // One point means zero coordinate span on both axes.
    expect(
      await screen.findByRole('button', { name: '33.51, 36.27: 9' }),
    ).toBeInTheDocument()
  })

  it('passes the date and track filters through to the API', async () => {
    let requestUrl = ''

    server.use(
      http.get('/api/v1/auth/me', () =>
        HttpResponse.json({ data: authority() }),
      ),
      http.get('/api/v1/authority/black-spots', ({ request }) => {
        requestUrl = request.url
        return HttpResponse.json({ data: [{ region: 'دمشق', count: 7 }] })
      }),
    )

    renderWithProviders(<AppRoutes />, { route: '/app/authority/black-spots' })

    await userEvent.selectOptions(
      await screen.findByLabelText('المسار'),
      'police_required',
    )

    await waitFor(() => expect(requestUrl).toContain('track=police_required'))
  })

  it('omits filters that are unset rather than sending blanks', async () => {
    let requestUrl = ''

    server.use(
      http.get('/api/v1/auth/me', () =>
        HttpResponse.json({ data: authority() }),
      ),
      http.get('/api/v1/authority/black-spots', ({ request }) => {
        requestUrl = request.url
        return HttpResponse.json({ data: [{ region: 'دمشق', count: 7 }] })
      }),
    )

    renderWithProviders(<AppRoutes />, { route: '/app/authority/black-spots' })

    await waitFor(() => expect(requestUrl).not.toBe(''))
    expect(requestUrl).not.toContain('from=')
    expect(requestUrl).not.toContain('track=')
  })

  it('keeps a regulator out of the authority screens', async () => {
    server.use(
      http.get('/api/v1/auth/me', () =>
        HttpResponse.json({ data: regulator() }),
      ),
    )

    renderWithProviders(<AppRoutes />, { route: '/app/authority/heatmap' })

    await waitFor(() =>
      expect(
        screen.queryByText('كثافة الحوادث'),
      ).not.toBeInTheDocument(),
    )
  })
})
