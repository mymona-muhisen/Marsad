import { HttpResponse, http } from 'msw'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { AppRoutes } from '@/routes/AppRoutes'
import { server } from '@/test/server'
import { makeUser, renderWithProviders, signInWithToken } from '@/test/utils'

const TOKEN = 'signed-join-token'
const CASE_NO = 'MC-26-JOIN01'

const TEASER = {
  case_no: CASE_NO,
  occurred_at: '2026-07-25T08:15:00.000000Z',
  region: 'دمشق',
}

function mockTeaser() {
  server.use(
    http.get(`/api/v1/cases/join/${TOKEN}`, () =>
      HttpResponse.json({ data: TEASER }),
    ),
  )
}

function mockSignedIn() {
  server.use(
    http.get('/api/v1/auth/me', () => HttpResponse.json({ data: makeUser() })),
  )
}

const photoFile = (name: string) =>
  new File(['x'], name, { type: 'image/jpeg' })

/** Each slot's file input is labelled with the slot's own Arabic name. */
const SLOT_LABELS = [
  'لقطة عامة',
  'المركبتان معاً',
  'الضرر عن قرب',
  'لوحة المركبة',
]

/** Fills all four guided slots, which is the backend's `photos min:4`. */
async function fillGuidedPhotos(user: ReturnType<typeof userEvent.setup>) {
  for (const label of SLOT_LABELS) {
    await user.upload(
      await screen.findByLabelText(label),
      photoFile(`${label}.jpg`),
    )
  }
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('counterparty join — anonymous arrival', () => {
  it('shows the case facts from an SMS deep link without an account', async () => {
    mockTeaser()

    renderWithProviders(<AppRoutes />, { route: `/join/${TOKEN}` })

    expect(await screen.findByText(CASE_NO)).toBeInTheDocument()
    expect(screen.getByText('دمشق')).toBeInTheDocument()
  })

  it('never reveals the reporter statement before the counterparty writes theirs', async () => {
    mockTeaser()

    renderWithProviders(<AppRoutes />, { route: `/join/${TOKEN}` })

    // UC-02 step 3: the teaser withholds it server-side, and the page says why.
    expect(
      await screen.findByText(/لتبقى إفادتك مستقلّة/),
    ).toBeInTheDocument()
  })

  it('sends an anonymous visitor to sign in and back to the same link', async () => {
    mockTeaser()

    renderWithProviders(<AppRoutes />, { route: `/join/${TOKEN}` })

    const signIn = await screen.findByRole('link', { name: 'تسجيل الدخول' })
    expect(signIn).toHaveAttribute('href', '/login')
    // The capture flow must not be reachable before sign-in.
    expect(screen.queryByText('صوّر مكان الحادث')).not.toBeInTheDocument()
  })

  it('explains an expired or forged token instead of failing blankly', async () => {
    server.use(
      http.get(`/api/v1/cases/join/${TOKEN}`, () =>
        HttpResponse.json({ message: 'Not found.' }, { status: 404 }),
      ),
    )

    renderWithProviders(<AppRoutes />, { route: `/join/${TOKEN}` })

    expect(
      await screen.findByText(/هذا الرابط غير صالح أو انتهت صلاحيته/),
    ).toBeInTheDocument()
  })
})

describe('counterparty join — signed in', () => {
  beforeEach(() => {
    signInWithToken()
    mockTeaser()
    mockSignedIn()
  })

  it('blocks the statement step until all four photos are taken', async () => {
    const user = userEvent.setup()

    renderWithProviders(<AppRoutes />, { route: `/join/${TOKEN}` })

    await user.click(await screen.findByRole('button', { name: 'التالي' }))

    expect(
      await screen.findByText('الصور الأربع الإرشادية مطلوبة كلها.'),
    ).toBeInTheDocument()
  })

  it('refuses to submit an empty account', async () => {
    const user = userEvent.setup()

    renderWithProviders(<AppRoutes />, { route: `/join/${TOKEN}` })

    await fillGuidedPhotos(user)
    await user.click(screen.getByRole('button', { name: 'التالي' }))
    await user.click(
      await screen.findByRole('button', { name: 'إرسال روايتي' }),
    )

    expect(
      await screen.findByText('اكتب روايتك عمّا حدث.'),
    ).toBeInTheDocument()
  })

  it('submits the statement and four photos as multipart', async () => {
    const user = userEvent.setup()
    let form: FormData | null = null

    server.use(
      http.post(`/api/v1/cases/join/${TOKEN}`, async ({ request }) => {
        form = await request.formData()
        return HttpResponse.json({ data: { case_no: CASE_NO } })
      }),
    )

    renderWithProviders(<AppRoutes />, { route: `/join/${TOKEN}` })

    await fillGuidedPhotos(user)
    await user.click(screen.getByRole('button', { name: 'التالي' }))
    await user.type(
      await screen.findByLabelText('روايتك'),
      'كنت أسير في مساري النظامي حين انحرفت المركبة الأخرى نحوي.',
    )
    await user.click(screen.getByRole('button', { name: 'إرسال روايتي' }))

    await waitFor(() => expect(form).not.toBeNull())
    expect(form!.getAll('photos[]')).toHaveLength(4)
    expect(form!.get('statement')).toBe(
      'كنت أسير في مساري النظامي حين انحرفت المركبة الأخرى نحوي.',
    )
  })

  it('offers the joined case, which the list scopes by party membership', async () => {
    const user = userEvent.setup()

    server.use(
      http.post(`/api/v1/cases/join/${TOKEN}`, () =>
        HttpResponse.json({ data: { case_no: CASE_NO } }),
      ),
    )

    renderWithProviders(<AppRoutes />, { route: `/join/${TOKEN}` })

    await fillGuidedPhotos(user)
    await user.click(screen.getByRole('button', { name: 'التالي' }))
    await user.type(await screen.findByLabelText('روايتك'), 'روايتي.')
    await user.click(screen.getByRole('button', { name: 'إرسال روايتي' }))

    expect(await screen.findByText('أُضيفت روايتك')).toBeInTheDocument()
    // Joining set case_parties.user_id, which is exactly what GET /cases
    // filters on — so no extra wiring is needed for it to appear.
    expect(
      screen.getByRole('link', { name: 'عرض القضية' }),
    ).toHaveAttribute('href', `/app/cases/${CASE_NO}`)
    expect(screen.getByRole('link', { name: 'قضاياي' })).toHaveAttribute(
      'href',
      '/app/cases',
    )
  })

  it('says plainly when the signed-in phone is not the reported party', async () => {
    const user = userEvent.setup()

    server.use(
      http.post(`/api/v1/cases/join/${TOKEN}`, () =>
        HttpResponse.json(
          {
            message: 'The given data was invalid.',
            errors: {
              phone: ['رقم الهاتف لا يطابق الطرف المُبلَغ عنه في هذا الحادث.'],
            },
          },
          { status: 422 },
        ),
      ),
    )

    renderWithProviders(<AppRoutes />, { route: `/join/${TOKEN}` })

    await fillGuidedPhotos(user)
    await user.click(screen.getByRole('button', { name: 'التالي' }))
    await user.type(await screen.findByLabelText('روايتك'), 'روايتي.')
    await user.click(screen.getByRole('button', { name: 'إرسال روايتي' }))

    expect(
      await screen.findByText(/سجّل الدخول بالرقم الذي وصلته الرسالة/),
    ).toBeInTheDocument()
  })

  it('lets the reader go back to retake a photo', async () => {
    const user = userEvent.setup()

    renderWithProviders(<AppRoutes />, { route: `/join/${TOKEN}` })

    await fillGuidedPhotos(user)
    await user.click(screen.getByRole('button', { name: 'التالي' }))
    await user.click(await screen.findByRole('button', { name: 'السابق' }))

    expect(await screen.findByText('صوّر مكان الحادث')).toBeInTheDocument()
  })
})
