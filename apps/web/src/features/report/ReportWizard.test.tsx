import { HttpResponse, http } from 'msw'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { AppRoutes } from '@/routes/AppRoutes'
import { server } from '@/test/server'
import { makeUser, renderWithProviders, signInWithToken } from '@/test/utils'
import { EMPTY_DRAFT, saveDraft } from './draft'

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

function photo(name: string) {
  return new File([new Uint8Array([255, 216, 255])], name, {
    type: 'image/jpeg',
  })
}

function mockSession() {
  signInWithToken()
  server.use(
    http.get('/api/v1/auth/me', () => HttpResponse.json({ data: makeUser() })),
    http.get('/api/v1/vehicles', () =>
      HttpResponse.json({
        data: [VEHICLE],
        meta: { current_page: 1, last_page: 1, per_page: 100, total: 1 },
      }),
    ),
  )
}

beforeEach(() => {
  mockSession()
})

describe('ReportWizard', () => {
  it('will not advance past step one without the required answers', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AppRoutes />, { route: '/report/new' })

    await user.click(await screen.findByRole('button', { name: /التالي/ }))

    expect(
      await screen.findByText('اختر المركبة المتضرّرة.'),
    ).toBeInTheDocument()
    // Still on the vehicle step.
    expect(screen.getByText('أي مركبة تعرّضت للحادث؟')).toBeInTheDocument()
  })

  it('resumes a saved draft at the step the reporter left', async () => {
    saveDraft({
      ...EMPTY_DRAFT,
      vehicleId: VEHICLE.id,
      occurredAt: '2026-07-28T10:00',
      injuryFlag: false,
      step: 1,
    })

    renderWithProviders(<AppRoutes />, { route: '/report/new' })

    expect(await screen.findByText('أين وقع الحادث؟')).toBeInTheDocument()
  })

  it('blocks the location step until coordinates are in range', async () => {
    const user = userEvent.setup()
    saveDraft({
      ...EMPTY_DRAFT,
      vehicleId: VEHICLE.id,
      occurredAt: '2026-07-28T10:00',
      injuryFlag: false,
      step: 1,
    })

    renderWithProviders(<AppRoutes />, { route: '/report/new' })

    await user.click(await screen.findByRole('button', { name: /التالي/ }))
    expect(await screen.findByText('حدّد موقع الحادث.')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('خط العرض'), {
      target: { value: '120' },
    })
    fireEvent.change(screen.getByLabelText('خط الطول'), {
      target: { value: '36.2765' },
    })
    await user.click(screen.getByRole('button', { name: /التالي/ }))

    expect(
      await screen.findByText('خط العرض يجب أن يكون بين -90 و 90.'),
    ).toBeInTheDocument()
  })

  it('carries the whole report through to a submitted case', async () => {
    const user = userEvent.setup()
    let submitted: FormData | null = null

    server.use(
      http.post('/api/v1/cases', async ({ request }) => {
        submitted = await request.formData()
        return HttpResponse.json(
          {
            data: {
              case_no: 'CS-2026-000042',
              status: 'submitted',
              track: 'fast_track',
              channel: 'self',
              occurred_at: '2026-07-28T10:00:00.000000Z',
              lat: 33.5138,
              lng: 36.2765,
              location_verified: false,
              region: null,
              injury_flag: false,
              police_report_ref: null,
              one_sided_flag: false,
              created_at: '2026-07-28T10:05:00.000000Z',
            },
          },
          { status: 201 },
        )
      }),
    )

    renderWithProviders(<AppRoutes />, { route: '/report/new' })

    // Step 1 — vehicle, time, injuries.
    await user.click(await screen.findByRole('radio', { name: /DAM-123456/ }))
    fireEvent.change(screen.getByLabelText(/متى وقع الحادث/), {
      target: { value: '2026-07-28T10:00' },
    })
    await user.click(screen.getByRole('radio', { name: /أضرار مادية فقط/ }))
    await user.click(screen.getByRole('button', { name: /التالي/ }))

    // Step 2 — location typed by hand (no geolocation in jsdom).
    fireEvent.change(await screen.findByLabelText('خط العرض'), {
      target: { value: '33.5138' },
    })
    fireEvent.change(screen.getByLabelText('خط الطول'), {
      target: { value: '36.2765' },
    })
    await user.click(screen.getByRole('button', { name: /التالي/ }))

    // Step 3 — the four guided shots.
    for (const slot of ['لقطة عامة', 'المركبتان معاً', 'الضرر عن قرب', 'لوحة المركبة']) {
      await user.upload(await screen.findByLabelText(slot), photo(`${slot}.jpg`))
    }
    await user.click(screen.getByRole('button', { name: /التالي/ }))

    // Step 4 — counterparty.
    fireEvent.change(await screen.findByLabelText(/رقم هاتف الطرف الآخر/), {
      target: { value: '0955555555' },
    })
    await user.click(screen.getByRole('button', { name: /التالي/ }))

    // Step 5 — statement.
    fireEvent.change(await screen.findByLabelText('إفادتك'), {
      target: { value: 'اصطدمت بي المركبة من الخلف عند الإشارة.' },
    })
    await user.click(screen.getByRole('button', { name: /التالي/ }))

    // Step 6 — review and send.
    await user.click(await screen.findByRole('button', { name: 'إرسال التبليغ' }))

    expect(await screen.findByText('CS-2026-000042')).toBeInTheDocument()
    expect(screen.getByText('تم استلام تبليغك')).toBeInTheDocument()
    // The triage verdict is explained, not just labelled.
    expect(screen.getByText(/مسار سريع/)).toBeInTheDocument()

    await waitFor(() => expect(submitted).not.toBeNull())
    const form = submitted as unknown as FormData
    expect(form.get('vehicle_id')).toBe('7')
    expect(form.get('injury_flag')).toBe('0')
    expect(form.get('counterparty_phone')).toBe('0955555555')
    expect(form.getAll('photos[]')).toHaveLength(4)

    // A submitted report must not leave a draft behind to resume.
    await waitFor(() =>
      expect(window.localStorage.getItem('masar.report.draft')).toBeNull(),
    )
  })

  it('keeps the draft when submission fails so nothing is retyped', async () => {
    const user = userEvent.setup()

    server.use(
      http.post('/api/v1/cases', () =>
        HttpResponse.json({ message: 'خطأ في الخادم.' }, { status: 500 }),
      ),
    )

    saveDraft({
      ...EMPTY_DRAFT,
      vehicleId: VEHICLE.id,
      occurredAt: '2026-07-28T10:00',
      injuryFlag: false,
      lat: 33.5138,
      lng: 36.2765,
      counterpartyPhone: '0955555555',
      statement: 'اصطدمت بي المركبة من الخلف.',
      step: 2,
    })

    renderWithProviders(<AppRoutes />, { route: '/report/new' })

    for (const slot of ['لقطة عامة', 'المركبتان معاً', 'الضرر عن قرب', 'لوحة المركبة']) {
      await user.upload(await screen.findByLabelText(slot), photo(`${slot}.jpg`))
    }
    await user.click(screen.getByRole('button', { name: /التالي/ }))
    await user.click(await screen.findByRole('button', { name: /التالي/ }))
    await user.click(await screen.findByRole('button', { name: /التالي/ }))
    await user.click(await screen.findByRole('button', { name: 'إرسال التبليغ' }))

    expect(await screen.findByText('خطأ في الخادم.')).toBeInTheDocument()
    expect(window.localStorage.getItem('masar.report.draft')).not.toBeNull()
  })
})
