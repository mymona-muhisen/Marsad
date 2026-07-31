import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useAuth } from '@/features/auth/useAuth'
import { cn } from '@/lib/utils'
import { AuditPanel } from './AuditPanel'
import { MatrixPanel } from './MatrixPanel'
import { UsersPanel } from './UsersPanel'

type Tab = 'users' | 'audit' | 'matrix'

export function AdminPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('users')

  // The audit trail records what admins did, so admins do not police it —
  // the route enforces this too; the tab is simply not offered.
  const canReadAudit = user?.roles.includes('super_admin') ?? false
  const tabs: Tab[] = canReadAudit
    ? ['users', 'audit', 'matrix']
    : ['users', 'matrix']

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">
          {t('admin.title')}
        </h1>
      </header>

      <div
        role="tablist"
        className="flex flex-wrap gap-2 border-b border-border"
      >
        {tabs.map((value) => (
          <button
            key={value}
            role="tab"
            type="button"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={cn(
              '-mb-px border-b-2 px-4 py-3 text-sm font-medium transition',
              tab === value
                ? 'border-primary text-primary'
                : 'border-transparent text-foreground/60 hover:text-foreground',
            )}
          >
            {t(`admin.tabs.${value}`)}
          </button>
        ))}
      </div>

      {tab === 'users' ? <UsersPanel /> : null}
      {tab === 'audit' && canReadAudit ? <AuditPanel /> : null}
      {tab === 'matrix' ? <MatrixPanel /> : null}
    </div>
  )
}
