import { HttpResponse, http } from 'msw'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { AppRoutes } from '@/routes/AppRoutes'
import { server } from '@/test/server'
import { makeUser, renderWithProviders, signInWithToken } from '@/test/utils'

const VEHICLE = {
  id: 7,
  plate_no: 'DAM-123456',
  vin: null,
  make: 'كيا',
  model: 'ريو',
  year: 2018,
  color: null,
  deleted_at: null,
  created_at: '2026-01-01T00:00:00.000000Z',
}

const emptyPage = {
  data: [],
  meta: { current_page: 1, last_page: 1, per_page: 100, total: 0 },
}

beforeEach(() => {
  signInWithToken()
  server.use(
    http.get('/api/v1/auth/me', () => HttpResponse.json({ data: makeUser() })),
  )
})

describe('VehiclesPage', () => {
  it('lists the signed-in user’s vehicles', async () => {
    server.use(
      http.get('/api/v1/vehicles', () =>
        HttpResponse.json({ ...emptyPage, data: [VEHICLE], meta: { ...emptyPage.meta, total: 1 } }),
      ),
    )

    renderWithProviders(<AppRoutes />, { route: '/app/vehicles' })

    expect(await screen.findByText('DAM-123456')).toBeInTheDocument()
    expect(screen.getByText(/كيا ريو/)).toBeInTheDocument()
  })

  it('says so when nothing is registered yet', async () => {
    server.use(http.get('/api/v1/vehicles', () => HttpResponse.json(emptyPage)))

    renderWithProviders(<AppRoutes />, { route: '/app/vehicles' })

    expect(await screen.findByText('لم تُسجّل أي مركبة بعد.')).toBeInTheDocument()
  })

  it('validates the form before calling the API', async () => {
    const user = userEvent.setup()
    server.use(http.get('/api/v1/vehicles', () => HttpResponse.json(emptyPage)))

    renderWithProviders(<AppRoutes />, { route: '/app/vehicles' })

    await user.click(await screen.findByRole('button', { name: /إضافة مركبة/ }))
    await user.click(screen.getByRole('button', { name: 'حفظ المركبة' }))

    // No POST handler is registered — reaching the network would fail the test.
    expect(await screen.findByText('رقم اللوحة مطلوب.')).toBeInTheDocument()
    expect(screen.getByText('الصانع مطلوب.')).toBeInTheDocument()
  })

  it('adds a vehicle and refreshes the list', async () => {
    const user = userEvent.setup()
    let created = false

    server.use(
      http.get('/api/v1/vehicles', () =>
        created
          ? HttpResponse.json({ ...emptyPage, data: [VEHICLE] })
          : HttpResponse.json(emptyPage),
      ),
      http.post('/api/v1/vehicles', async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>
        created = true
        return HttpResponse.json({ data: { ...VEHICLE, ...body } }, { status: 201 })
      }),
    )

    renderWithProviders(<AppRoutes />, { route: '/app/vehicles' })

    await user.click(await screen.findByRole('button', { name: /إضافة مركبة/ }))
    await user.type(screen.getByLabelText('رقم اللوحة'), 'DAM-123456')
    await user.type(screen.getByLabelText('الصانع'), 'كيا')
    await user.type(screen.getByLabelText('الطراز'), 'ريو')
    await user.click(screen.getByRole('button', { name: 'حفظ المركبة' }))

    await waitFor(() =>
      expect(screen.getByText('DAM-123456')).toBeInTheDocument(),
    )
  })

  it('rejects a year outside the accepted range', async () => {
    const user = userEvent.setup()
    server.use(http.get('/api/v1/vehicles', () => HttpResponse.json(emptyPage)))

    renderWithProviders(<AppRoutes />, { route: '/app/vehicles' })

    await user.click(await screen.findByRole('button', { name: /إضافة مركبة/ }))
    await user.type(screen.getByLabelText('رقم اللوحة'), 'DAM-1')
    await user.type(screen.getByLabelText('الصانع'), 'كيا')
    await user.type(screen.getByLabelText('الطراز'), 'ريو')
    await user.type(screen.getByLabelText(/سنة الصنع/), '1900')
    await user.click(screen.getByRole('button', { name: 'حفظ المركبة' }))

    expect(
      await screen.findByText('سنة الصنع بين 1950 و 2030.'),
    ).toBeInTheDocument()
  })
})
