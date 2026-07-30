import { HttpResponse, http } from 'msw'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { server } from '@/test/server'
import { makeUser, renderWithProviders } from '@/test/utils'
import { AppRoutes } from '@/routes/AppRoutes'

describe('LoginPage', () => {
  it('rejects a badly formatted phone number before calling the API', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AppRoutes />, { route: '/login' })

    await user.type(screen.getByLabelText('رقم الهاتف'), '12345')
    await user.click(screen.getByRole('button', { name: 'إرسال رمز التحقق' }))

    // No MSW handler is registered: reaching the network would fail the test.
    expect(
      await screen.findByText('أدخل رقماً سورياً صحيحاً يبدأ بـ 09 (10 أرقام).'),
    ).toBeInTheDocument()
  })

  it('moves to the code step after the code is requested', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('/api/v1/auth/otp/request', () =>
        HttpResponse.json({ message: 'تم إرسال رمز التحقق.' }),
      ),
    )

    renderWithProviders(<AppRoutes />, { route: '/login' })

    await user.type(screen.getByLabelText('رقم الهاتف'), '0911111111')
    await user.click(screen.getByRole('button', { name: 'إرسال رمز التحقق' }))

    expect(await screen.findByLabelText('رمز التحقق')).toBeInTheDocument()
    expect(screen.getByText(/0911111111/)).toBeInTheDocument()
  })

  it('surfaces the backend’s full_name requirement on the phone field', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('/api/v1/auth/otp/request', () =>
        HttpResponse.json(
          {
            message: 'بيانات غير صحيحة.',
            errors: { full_name: ['حقل الاسم الكامل مطلوب.'] },
          },
          { status: 422 },
        ),
      ),
    )

    renderWithProviders(<AppRoutes />, { route: '/login' })

    await user.type(screen.getByLabelText('رقم الهاتف'), '0911111111')
    await user.click(screen.getByRole('button', { name: 'إرسال رمز التحقق' }))

    expect(await screen.findByText('حقل الاسم الكامل مطلوب.')).toBeInTheDocument()
    // Still on step one — the user has to supply the name before continuing.
    expect(screen.queryByLabelText('رمز التحقق')).not.toBeInTheDocument()
  })

  it('signs in and lands on the app home after a correct code', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('/api/v1/auth/otp/request', () =>
        HttpResponse.json({ message: 'تم إرسال رمز التحقق.' }),
      ),
      http.post('/api/v1/auth/otp/verify', () =>
        HttpResponse.json({ user: makeUser(), token: 'fresh-token' }),
      ),
      http.get('/api/v1/auth/me', () => HttpResponse.json({ data: makeUser() })),
    )

    renderWithProviders(<AppRoutes />, { route: '/login' })

    await user.type(screen.getByLabelText('رقم الهاتف'), '0911111111')
    await user.click(screen.getByRole('button', { name: 'إرسال رمز التحقق' }))

    await user.type(await screen.findByLabelText('رمز التحقق'), '123456')
    await user.click(screen.getByRole('button', { name: 'تأكيد ودخول' }))

    expect(
      await screen.findByRole('heading', { name: /محمد أحمد/ }),
    ).toBeInTheDocument()

    await waitFor(() =>
      expect(window.localStorage.getItem('marsad.auth.token')).toBe('fresh-token'),
    )
  })

  it('shows the wrong-code message without leaving the code step', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('/api/v1/auth/otp/request', () =>
        HttpResponse.json({ message: 'تم إرسال رمز التحقق.' }),
      ),
      http.post('/api/v1/auth/otp/verify', () =>
        HttpResponse.json(
          {
            message: 'رمز التحقق غير صحيح.',
            errors: { code: ['رمز التحقق غير صحيح.'] },
          },
          { status: 422 },
        ),
      ),
    )

    renderWithProviders(<AppRoutes />, { route: '/login' })

    await user.type(screen.getByLabelText('رقم الهاتف'), '0911111111')
    await user.click(screen.getByRole('button', { name: 'إرسال رمز التحقق' }))

    await user.type(await screen.findByLabelText('رمز التحقق'), '000000')
    await user.click(screen.getByRole('button', { name: 'تأكيد ودخول' }))

    expect(await screen.findByText('رمز التحقق غير صحيح.')).toBeInTheDocument()
    expect(screen.getByLabelText('رمز التحقق')).toBeInTheDocument()
  })
})
