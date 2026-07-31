import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { TextField } from '@/components/ui/TextField'
import { useAuth } from '@/features/auth/useAuth'
import { ApiError } from '@/lib/api/errors'
import { ROLES, type Role } from '@/lib/roles'
import type { User } from '@/lib/api/types'
import { adminUsersQueryKey, fetchUsers, syncRoles } from './api'

function RoleEditor({
  user,
  onDone,
}: {
  user: User
  onDone: () => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { user: actor } = useAuth()

  const [roles, setRoles] = useState<string[]>(user.roles)
  const [error, setError] = useState<string | null>(null)

  // Mirrors RoleAssignmentService: only a super admin may move that role, so
  // showing the checkbox to anyone else invites a guaranteed 422.
  const canGrantSuperAdmin = actor?.roles.includes('super_admin') ?? false

  const mutation = useMutation({
    mutationFn: () => syncRoles({ userId: user.id, roles }),
    onSuccess: async () => {
      setError(null)
      await queryClient.invalidateQueries({ queryKey: adminUsersQueryKey })
      onDone()
    },
    onError: (cause) =>
      setError(
        cause instanceof ApiError && cause.fieldError('roles')
          ? (cause.fieldError('roles') as string)
          : cause instanceof ApiError && cause.message
            ? cause.message
            : t('errors.unexpected'),
      ),
  })

  const toggle = (role: Role) =>
    setRoles((current) =>
      current.includes(role)
        ? current.filter((item) => item !== role)
        : [...current, role],
    )

  return (
    <div className="flex flex-col gap-4 rounded-xl bg-foreground/4 p-4">
      {error ? <Alert tone="danger">{error}</Alert> : null}

      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {ROLES.filter(
          (role) => role !== 'super_admin' || canGrantSuperAdmin,
        ).map((role) => (
          <li key={role}>
            <label className="flex items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={roles.includes(role)}
                onChange={() => toggle(role)}
                className="size-4 rounded border-border"
              />
              {t(`roles.${role}`, { defaultValue: role })}
            </label>
          </li>
        ))}
      </ul>

      {!canGrantSuperAdmin ? (
        <p className="text-xs text-foreground/55">
          {t('admin.users.reservedHint')}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button loading={mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending ? t('admin.users.saving') : t('admin.users.save')}
        </Button>
        <Button variant="ghost" onClick={onDone}>
          {t('admin.users.cancel')}
        </Button>
      </div>
    </div>
  )
}

export function UsersPanel() {
  const { t } = useTranslation()
  const [q, setQ] = useState('')
  const [role, setRole] = useState('')
  const [editing, setEditing] = useState<number | null>(null)

  const users = useQuery({
    queryKey: [...adminUsersQueryKey, q, role],
    queryFn: () => fetchUsers({ q, role }),
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-5">
        <TextField
          label={t('admin.users.search')}
          placeholder={t('admin.users.searchPlaceholder')}
          value={q}
          onChange={(event) => setQ(event.target.value)}
          className="min-w-64"
        />

        <div className="flex flex-col gap-2">
          <label htmlFor="role-filter" className="text-sm font-medium">
            {t('admin.users.filterRole')}
          </label>
          <select
            id="role-filter"
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className="min-h-11 rounded-xl border border-border bg-background px-4 text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
          >
            <option value="">{t('admin.users.allRoles')}</option>
            {ROLES.map((value) => (
              <option key={value} value={value}>
                {t(`roles.${value}`, { defaultValue: value })}
              </option>
            ))}
          </select>
        </div>
      </div>

      {users.isPending ? (
        <p className="flex items-center gap-3 text-sm text-foreground/60">
          <Spinner className="size-4 text-primary" />
          {t('common.loading')}
        </p>
      ) : null}

      {users.isError ? (
        <Alert tone="danger">{t('errors.network')}</Alert>
      ) : null}

      {users.data && users.data.data.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-foreground/60">
          {t('admin.users.empty')}
        </p>
      ) : null}

      {users.data && users.data.data.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {users.data.data.map((user) => (
            <li
              key={user.id}
              className="flex flex-col gap-4 rounded-2xl border border-border p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{user.full_name}</p>
                  <p className="text-sm tabular-nums text-foreground/55" dir="ltr">
                    {user.phone}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {user.roles.length === 0 ? (
                    <span className="text-sm text-foreground/50">
                      {t('admin.users.noRoles')}
                    </span>
                  ) : (
                    user.roles.map((name) => (
                      <span
                        key={name}
                        className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                      >
                        {t(`roles.${name}`, { defaultValue: name })}
                      </span>
                    ))
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setEditing((current) =>
                        current === user.id ? null : user.id,
                      )
                    }
                  >
                    {t('admin.users.edit')}
                  </Button>
                </div>
              </div>

              {editing === user.id ? (
                <RoleEditor user={user} onDone={() => setEditing(null)} />
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
