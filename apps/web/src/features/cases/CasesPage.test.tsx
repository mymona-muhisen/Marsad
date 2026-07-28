import { HttpResponse, http } from 'msw'
import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { AppRoutes } from '@/routes/AppRoutes'
import { server } from '@/test/server'
import { makeUser, renderWithProviders, signInWithToken } from '@/test/utils'

const emptyPage = {
  data: [],
  meta: { current_page: 1, last_page: 1, per_page: 50, total: 0 },
}

const CASE = {
  case_no: 'MC-26-ABC123',
  status: 'awaiting_counterparty',
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
}

beforeEach(() => {
  signInWithToken()
  server.use(
    http.get('/api/v1/auth/me', () => HttpResponse.json({ data: makeUser() })),
  )
})

describe('CasesPage', () => {
  it('lists cases with a translated status chip', async () => {
    server.use(
      http.get('/api/v1/cases', () =>
        HttpResponse.json({ ...emptyPage, data: [CASE] }),
      ),
    )

    renderWithProviders(<AppRoutes />, { route: '/app/cases' })

    expect(await screen.findByText('MC-26-ABC123')).toBeInTheDocument()
    expect(screen.getByText('بانتظار الطرف الآخر')).toBeInTheDocument()
  })

  it('offers the reporting flow when there are no cases', async () => {
    server.use(http.get('/api/v1/cases', () => HttpResponse.json(emptyPage)))

    renderWithProviders(<AppRoutes />, { route: '/app/cases' })

    expect(await screen.findByText('لا توجد قضايا بعد.')).toBeInTheDocument()

    // Two exist by design: the shell's permanent header CTA and this empty
    // state's. Both must lead to the same place.
    const ctas = screen.getAllByRole('link', { name: 'بلّغ عن حادث' })
    expect(ctas.length).toBeGreaterThan(1)
    ctas.forEach((cta) => expect(cta).toHaveAttribute('href', '/report/new'))
  })

  it('links each row to its case detail by case_no', async () => {
    server.use(
      http.get('/api/v1/cases', () =>
        HttpResponse.json({ ...emptyPage, data: [CASE] }),
      ),
    )

    renderWithProviders(<AppRoutes />, { route: '/app/cases' })

    const link = await screen.findByRole('link', { name: /MC-26-ABC123/ })
    expect(link).toHaveAttribute('href', '/app/cases/MC-26-ABC123')
  })
})
