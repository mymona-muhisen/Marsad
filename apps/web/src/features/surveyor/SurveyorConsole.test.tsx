import { HttpResponse, http } from 'msw'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { AppRoutes } from '@/routes/AppRoutes'
import { server } from '@/test/server'
import { makeUser, renderWithProviders, signInWithToken } from '@/test/utils'
import { isIdempotencyKey } from '@/lib/idempotency'
import type { Dispatch, DispatchStatus } from '@/lib/api/types'

const surveyor = () => makeUser({ roles: ['surveyor'] })

function dispatchRow(overrides: Partial<Dispatch> = {}): Dispatch {
  return {
    id: 5,
    case_id: 3,
    zone: 'دمشق',
    status: 'assigned',
    decline_reason: null,
    assigned_at: '2026-07-31T08:00:00.000000Z',
    accepted_at: null,
    completed_at: null,
    case: {
      case_no: 'MC-26-FIELD1',
      occurred_at: '2026-07-31T07:30:00.000000Z',
      region: 'دمشق',
      location_description: 'أوتوستراد المزة، مقابل مشفى الشامي.',
      location_verified: false,
      lat: 33.5138,
      lng: 36.2765,
      injury_flag: false,
      status: 'under_review',
    },
    ...overrides,
  }
}

const page = (rows: Dispatch[]) => ({
  data: rows,
  meta: { current_page: 1, last_page: 1, per_page: 50, total: rows.length },
})

function mockQueue(rows: Dispatch[]) {
  server.use(
    http.get('/api/v1/auth/me', () =>
      HttpResponse.json({ data: surveyor() }),
    ),
    http.get('/api/v1/surveyor/dispatches', () => HttpResponse.json(page(rows))),
  )
}

beforeEach(() => {
  signInWithToken()
})

describe('surveyor dispatch queue', () => {
  it('shows the address, not just a case id', async () => {
    mockQueue([dispatchRow()])

    renderWithProviders(<AppRoutes />, { route: '/app/surveyor/dispatches' })

    expect(await screen.findByText('MC-26-FIELD1')).toBeInTheDocument()
    // A dispatch with no address is not a dispatch.
    expect(
      screen.getByText(/أوتوستراد المزة، مقابل مشفى الشامي/),
    ).toBeInTheDocument()
  })

  it('warns that the location is not device-confirmed', async () => {
    mockQueue([dispatchRow()])

    renderWithProviders(<AppRoutes />, { route: '/app/surveyor/dispatches' })

    expect(
      await screen.findByText(/موقع غير مثبَّت من الجهاز/),
    ).toBeInTheDocument()
  })

  it('flags injuries before the surveyor sets off', async () => {
    mockQueue([
      dispatchRow({
        case: { ...dispatchRow().case!, injury_flag: true },
      }),
    ])

    renderWithProviders(<AppRoutes />, { route: '/app/surveyor/dispatches' })

    expect(
      await screen.findByText(/تأكّد من وصول الإسعاف قبل المعاينة/),
    ).toBeInTheDocument()
  })

  it('says so when nothing is assigned', async () => {
    mockQueue([])

    renderWithProviders(<AppRoutes />, { route: '/app/surveyor/dispatches' })

    expect(
      await screen.findByText('لا توجد مهام موكَلة إليك حالياً.'),
    ).toBeInTheDocument()
  })
})

describe('accepting and declining', () => {
  it('accepts an assignment', async () => {
    const user = userEvent.setup()
    let accepted = false

    mockQueue([dispatchRow()])
    server.use(
      http.post('/api/v1/surveyor/dispatches/5/accept', () => {
        accepted = true
        return HttpResponse.json({ data: dispatchRow({ status: 'accepted' }) })
      }),
    )

    renderWithProviders(<AppRoutes />, { route: '/app/surveyor/dispatches' })

    await user.click(await screen.findByRole('button', { name: 'قبول المهمة' }))

    await waitFor(() => expect(accepted).toBe(true))
  })

  it('will not decline without a reason', async () => {
    const user = userEvent.setup()
    mockQueue([dispatchRow()])

    renderWithProviders(<AppRoutes />, { route: '/app/surveyor/dispatches' })

    await user.click(await screen.findByRole('button', { name: 'اعتذار' }))
    await user.click(screen.getByRole('button', { name: 'تأكيد الاعتذار' }))

    // Declining reassigns the case, so the reason is on the record.
    expect(await screen.findByText('سبب الاعتذار مطلوب.')).toBeInTheDocument()
  })

  it('sends the decline reason', async () => {
    const user = userEvent.setup()
    let posted: unknown = null

    mockQueue([dispatchRow()])
    server.use(
      http.post('/api/v1/surveyor/dispatches/5/decline', async ({ request }) => {
        posted = await request.json()
        return HttpResponse.json({ data: dispatchRow({ status: 'declined' }) })
      }),
    )

    renderWithProviders(<AppRoutes />, { route: '/app/surveyor/dispatches' })

    await user.click(await screen.findByRole('button', { name: 'اعتذار' }))
    await user.type(
      screen.getByLabelText('سبب الاعتذار'),
      'مرتبط بمهمة أخرى.',
    )
    await user.click(screen.getByRole('button', { name: 'تأكيد الاعتذار' }))

    await waitFor(() =>
      expect(posted).toEqual({ reason: 'مرتبط بمهمة أخرى.' }),
    )
  })
})

describe('on-scene and completion', () => {
  it('offers the arrival step only once accepted', async () => {
    mockQueue([dispatchRow({ status: 'accepted' })])

    renderWithProviders(<AppRoutes />, { route: '/app/surveyor/dispatches' })

    expect(
      await screen.findByRole('button', { name: 'وصلت إلى الموقع' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'قبول المهمة' }),
    ).not.toBeInTheDocument()
  })

  it('blocks completion until the four guided photos are taken', async () => {
    const user = userEvent.setup()
    mockQueue([dispatchRow({ status: 'on_scene' })])

    renderWithProviders(<AppRoutes />, { route: '/app/surveyor/dispatches' })

    await user.click(
      await screen.findByRole('button', {
        name: 'إنهاء المعاينة ورفع الأدلة',
      }),
    )

    expect(
      await screen.findByText('الصور الأربع الإرشادية مطلوبة كلها.'),
    ).toBeInTheDocument()
  })

  it('shows the completed state without action buttons', async () => {
    mockQueue([dispatchRow({ status: 'completed' })])

    renderWithProviders(<AppRoutes />, { route: '/app/surveyor/dispatches' })

    expect(await screen.findByText('اكتملت المعاينة')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'وصلت إلى الموقع' }),
    ).not.toBeInTheDocument()
  })

  it('shows the recorded decline reason', async () => {
    mockQueue([
      dispatchRow({ status: 'declined', decline_reason: 'خارج نطاق منطقتي.' }),
    ])

    renderWithProviders(<AppRoutes />, { route: '/app/surveyor/dispatches' })

    expect(await screen.findByText(/خارج نطاق منطقتي/)).toBeInTheDocument()
  })
})

describe('the upload payload', () => {
  it('sends one well-formed key per photo under photo_keys', async () => {
    const { buildCompleteFormData } = await import('./api')

    const photos = ['a', 'b', 'c', 'd'].map(
      (n) => new File(['x'], `${n}.jpg`, { type: 'image/jpeg' }),
    )
    const keys = photos.map(
      (_, i) => `1111111${i}-1111-4111-8111-111111111111`,
    )

    const form = buildCompleteFormData({ id: 5, photos, photoKeys: keys })

    // This endpoint *requires* the keys, size-matched to the photos —
    // unlike the citizen paths where they are optional.
    expect(form.getAll('photos[]')).toHaveLength(4)
    expect(form.getAll('photo_keys[]')).toHaveLength(4)
    for (const key of form.getAll('photo_keys[]')) {
      expect(isIdempotencyKey(String(key))).toBe(true)
    }
  })
})

describe('role isolation', () => {
  it('keeps a citizen out of the dispatch queue', async () => {
    server.use(
      http.get('/api/v1/auth/me', () => HttpResponse.json({ data: makeUser() })),
    )

    renderWithProviders(<AppRoutes />, { route: '/app/surveyor/dispatches' })

    await waitFor(() =>
      expect(screen.queryByText('مهامي الميدانية')).not.toBeInTheDocument(),
    )
  })
})

describe('status vocabulary', () => {
  const expected: Record<DispatchStatus, string> = {
    assigned: 'بانتظار قبولك',
    accepted: 'مقبولة',
    on_scene: 'في الموقع',
    completed: 'مكتملة',
    declined: 'معتذَر عنها',
  }

  it.each(Object.entries(expected))(
    'translates the %s status rather than showing the raw key',
    async (status, label) => {
      mockQueue([dispatchRow({ status: status as DispatchStatus })])

      renderWithProviders(<AppRoutes />, {
        route: '/app/surveyor/dispatches',
      })

      expect(await screen.findByText(label)).toBeInTheDocument()
      // A missing i18n key falls through to the key itself.
      expect(screen.queryByText(/^dispatchStatus\./)).not.toBeInTheDocument()
    },
  )
})
