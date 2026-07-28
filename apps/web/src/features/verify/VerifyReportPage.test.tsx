import { HttpResponse, http } from 'msw'
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { server } from '@/test/server'
import { renderWithProviders } from '@/test/utils'
import { AppRoutes } from '@/routes/AppRoutes'

describe('VerifyReportPage', () => {
  it('confirms an active report without requiring a session', async () => {
    let authHeader: string | null = 'unset'

    server.use(
      http.get('/api/v1/reports/verify/:token', ({ request }) => {
        authHeader = request.headers.get('Authorization')
        return HttpResponse.json({
          data: {
            report_no: 'RPT-2026-000123',
            issued_at: '2026-07-20T09:30:00.000000Z',
            status: 'active',
            superseded_by: null,
          },
        })
      }),
    )

    renderWithProviders(<AppRoutes />, { route: '/verify/qr-token-123' })

    expect(
      await screen.findByText('تقرير صحيح وصادر عن المنصّة'),
    ).toBeInTheDocument()
    expect(screen.getByText('RPT-2026-000123')).toBeInTheDocument()
    // UC-07 is a public endpoint: no credential must be attached.
    expect(authHeader).toBeNull()
  })

  it('flags a superseded report and names its replacement', async () => {
    server.use(
      http.get('/api/v1/reports/verify/:token', () =>
        HttpResponse.json({
          data: {
            report_no: 'RPT-2026-000123',
            issued_at: '2026-07-20T09:30:00.000000Z',
            status: 'superseded',
            superseded_by: 'RPT-2026-000456',
          },
        }),
      ),
    )

    renderWithProviders(<AppRoutes />, { route: '/verify/qr-token-123' })

    expect(
      await screen.findByText('هذا التقرير مُستبدَل بنسخة أحدث'),
    ).toBeInTheDocument()
    expect(screen.getByText('RPT-2026-000456')).toBeInTheDocument()
  })

  it('reports an unknown token as not found', async () => {
    server.use(
      http.get('/api/v1/reports/verify/:token', () =>
        HttpResponse.json({ message: 'No such report.' }, { status: 404 }),
      ),
    )

    renderWithProviders(<AppRoutes />, { route: '/verify/nope' })

    expect(
      await screen.findByText('لا يوجد تقرير بهذا الرمز'),
    ).toBeInTheDocument()
  })

  it('shows the empty form with no token in the URL', async () => {
    renderWithProviders(<AppRoutes />, { route: '/verify' })

    expect(
      await screen.findByRole('heading', { name: 'التحقق من صحة تقرير' }),
    ).toBeInTheDocument()
    // Nothing is fetched until the visitor supplies a token.
    expect(screen.queryByText('جارٍ التحقق…')).not.toBeInTheDocument()
  })
})
