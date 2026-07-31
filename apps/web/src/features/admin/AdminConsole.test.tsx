import { HttpResponse, http } from 'msw'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { AppRoutes } from '@/routes/AppRoutes'
import { server } from '@/test/server'
import { makeUser, renderWithProviders, signInWithToken } from '@/test/utils'

const admin = () => makeUser({ id: 1, roles: ['admin'] })
const superAdmin = () => makeUser({ id: 1, roles: ['super_admin'] })

const subject = {
  id: 7,
  full_name: 'سعاد الحسن',
  phone: '0955555555',
  locale: 'ar',
  status: 'active',
  organization_id: null,
  roles: ['citizen'],
}

const usersPage = {
  data: [subject],
  meta: { current_page: 1, last_page: 1, per_page: 50, total: 1 },
}

function mockAdmin(actor = admin()) {
  server.use(
    http.get('/api/v1/auth/me', () => HttpResponse.json({ data: actor })),
    http.get('/api/v1/admin/users', () => HttpResponse.json(usersPage)),
    http.get('/api/v1/liability-rules', () => HttpResponse.json({ data: [] })),
  )
}

beforeEach(() => {
  signInWithToken()
})

describe('users and roles', () => {
  it('lists users with their roles', async () => {
    mockAdmin()

    renderWithProviders(<AppRoutes />, { route: '/app/admin' })

    expect(await screen.findByText('سعاد الحسن')).toBeInTheDocument()
    expect(screen.getByText('0955555555')).toBeInTheDocument()
  })

  it('sends the whole role set on save', async () => {
    const user = userEvent.setup()
    let posted: unknown = null

    mockAdmin()
    server.use(
      http.post('/api/v1/admin/users/7/roles', async ({ request }) => {
        posted = await request.json()
        return HttpResponse.json({
          data: { ...subject, roles: ['citizen', 'surveyor'] },
        })
      }),
    )

    renderWithProviders(<AppRoutes />, { route: '/app/admin' })

    await user.click(await screen.findByRole('button', { name: 'تعديل الأدوار' }))
    await user.click(screen.getByLabelText('خبير ميداني'))
    await user.click(screen.getByRole('button', { name: 'حفظ' }))

    await waitFor(() =>
      expect(posted).toEqual({ roles: ['citizen', 'surveyor'] }),
    )
  })

  it('hides the super admin checkbox from a plain admin', async () => {
    const user = userEvent.setup()
    mockAdmin()

    renderWithProviders(<AppRoutes />, { route: '/app/admin' })

    await user.click(await screen.findByRole('button', { name: 'تعديل الأدوار' }))

    // Offering a checkbox that guarantees a 422 is worse than omitting it.
    expect(screen.queryByLabelText('مدير تقني')).not.toBeInTheDocument()
    expect(screen.getByText(/لا يمنحه إلا مدير تقني آخر/)).toBeInTheDocument()
  })

  it('offers the super admin checkbox to a super admin', async () => {
    const user = userEvent.setup()
    mockAdmin(superAdmin())
    server.use(
      http.get('/api/v1/admin/audit-logs', () =>
        HttpResponse.json({
          data: [],
          meta: { current_page: 1, last_page: 1, per_page: 50, total: 0 },
        }),
      ),
    )

    renderWithProviders(<AppRoutes />, { route: '/app/admin' })

    await user.click(await screen.findByRole('button', { name: 'تعديل الأدوار' }))

    expect(screen.getByLabelText('مدير تقني')).toBeInTheDocument()
  })

  it('surfaces the server refusal when an admin over-reaches', async () => {
    const user = userEvent.setup()
    mockAdmin()
    server.use(
      http.post('/api/v1/admin/users/7/roles', () =>
        HttpResponse.json(
          {
            message: 'The given data was invalid.',
            errors: { roles: ['لا تملك صلاحية منح هذا الدور أو سحبه.'] },
          },
          { status: 422 },
        ),
      ),
    )

    renderWithProviders(<AppRoutes />, { route: '/app/admin' })

    await user.click(await screen.findByRole('button', { name: 'تعديل الأدوار' }))
    await user.click(screen.getByLabelText('خبير ميداني'))
    await user.click(screen.getByRole('button', { name: 'حفظ' }))

    expect(
      await screen.findByText('لا تملك صلاحية منح هذا الدور أو سحبه.'),
    ).toBeInTheDocument()
  })
})

describe('the audit trail', () => {
  it('is not offered to a plain admin', async () => {
    mockAdmin()

    renderWithProviders(<AppRoutes />, { route: '/app/admin' })

    await screen.findByText('سعاد الحسن')
    // The route enforces it too; the tab is simply not there.
    expect(
      screen.queryByRole('tab', { name: 'سجل التدقيق' }),
    ).not.toBeInTheDocument()
  })

  it('shows entries to a super admin, naming the actor', async () => {
    const user = userEvent.setup()
    mockAdmin(superAdmin())
    server.use(
      http.get('/api/v1/admin/audit-logs', () =>
        HttpResponse.json({
          data: [
            {
              id: 1,
              action: 'roles_synced',
              entity_type: 'User',
              entity_id: 7,
              changes: { before: ['citizen'], after: ['citizen', 'surveyor'] },
              created_at: '2026-07-31T10:00:00.000000Z',
              actor: { full_name: 'مدير المنصة', phone: '0900000012' },
            },
          ],
          meta: { current_page: 1, last_page: 1, per_page: 50, total: 1 },
        }),
      ),
    )

    renderWithProviders(<AppRoutes />, { route: '/app/admin' })

    await user.click(await screen.findByRole('tab', { name: 'سجل التدقيق' }))

    expect(await screen.findByText('مدير المنصة')).toBeInTheDocument()
    expect(screen.getByText('تغيير أدوار')).toBeInTheDocument()
  })

  it('labels an actorless entry as the system rather than blank', async () => {
    const user = userEvent.setup()
    mockAdmin(superAdmin())
    server.use(
      http.get('/api/v1/admin/audit-logs', () =>
        HttpResponse.json({
          data: [
            {
              id: 2,
              action: 'created',
              entity_type: 'Claim',
              entity_id: 3,
              changes: null,
              created_at: '2026-07-31T10:00:00.000000Z',
            },
          ],
          meta: { current_page: 1, last_page: 1, per_page: 50, total: 1 },
        }),
      ),
    )

    renderWithProviders(<AppRoutes />, { route: '/app/admin' })

    await user.click(await screen.findByRole('tab', { name: 'سجل التدقيق' }))

    // The observer logs no actor for system-triggered mutations on purpose.
    expect(await screen.findByText('النظام')).toBeInTheDocument()
  })
})

describe('the liability matrix', () => {
  it('blocks a split that does not total 100', async () => {
    const user = userEvent.setup()
    mockAdmin()

    renderWithProviders(<AppRoutes />, { route: '/app/admin' })

    await user.click(
      await screen.findByRole('tab', { name: 'مصفوفة المسؤولية' }),
    )

    const splitB = await screen.findByLabelText('نسبة الطرف الثاني')
    await user.clear(splitB)
    await user.type(splitB, '40')

    expect(
      screen.getByRole('button', { name: 'نشر النسخة' }),
    ).toBeDisabled()
  })

  it('publishes a new version rather than editing one', async () => {
    const user = userEvent.setup()
    let posted: unknown = null

    mockAdmin()
    server.use(
      http.post('/api/v1/admin/liability-rules', async ({ request }) => {
        posted = await request.json()
        return HttpResponse.json({ data: { id: 9, version: 2 } }, { status: 201 })
      }),
    )

    renderWithProviders(<AppRoutes />, { route: '/app/admin' })

    await user.click(
      await screen.findByRole('tab', { name: 'مصفوفة المسؤولية' }),
    )

    await user.type(screen.getByLabelText('رمز الحالة'), 'REAR_END')
    await user.type(screen.getByLabelText('الوصف بالعربية'), 'نسخة معدّلة.')
    await user.type(screen.getByLabelText('تاريخ السريان'), '2026-09-01')
    await user.click(screen.getByRole('button', { name: 'نشر النسخة' }))

    await waitFor(() =>
      expect(posted).toEqual({
        scenario_code: 'REAR_END',
        description_ar: 'نسخة معدّلة.',
        fault_split_a: 100,
        fault_split_b: 0,
        effective_from: '2026-09-01',
      }),
    )
  })
})

describe('role isolation', () => {
  it('keeps a citizen out of the console', async () => {
    server.use(
      http.get('/api/v1/auth/me', () => HttpResponse.json({ data: makeUser() })),
    )

    renderWithProviders(<AppRoutes />, { route: '/app/admin' })

    await waitFor(() =>
      expect(screen.queryByText('الإدارة')).not.toBeInTheDocument(),
    )
  })

  it('offers an admin the users and matrix tabs only', async () => {
    mockAdmin()

    renderWithProviders(<AppRoutes />, { route: '/app/admin' })

    const tablist = await screen.findByRole('tablist')
    expect(within(tablist).getAllByRole('tab')).toHaveLength(2)
  })
})
