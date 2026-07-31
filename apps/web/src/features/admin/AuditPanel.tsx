import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { formatDateTime } from '@/lib/format'
import { useLocale } from '@/i18n/useLocale'
import { auditLogsQueryKey, fetchAuditLogs } from './api'

const ENTITIES = ['FaultDecision', 'Claim', 'User', 'LiabilityRule']

export function AuditPanel() {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const [entity, setEntity] = useState('')

  const logs = useQuery({
    queryKey: [...auditLogsQueryKey, entity],
    queryFn: () => fetchAuditLogs(entity || undefined),
  })

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm leading-7 text-foreground/65">
        {t('admin.audit.subtitle')}
      </p>

      <div className="flex flex-col gap-2">
        <label htmlFor="entity-filter" className="text-sm font-medium">
          {t('admin.audit.filterEntity')}
        </label>
        <select
          id="entity-filter"
          value={entity}
          onChange={(event) => setEntity(event.target.value)}
          className="min-h-11 max-w-xs rounded-xl border border-border bg-background px-4 text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
        >
          <option value="">{t('admin.audit.allEntities')}</option>
          {ENTITIES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>

      {logs.isPending ? (
        <p className="flex items-center gap-3 text-sm text-foreground/60">
          <Spinner className="size-4 text-primary" />
          {t('common.loading')}
        </p>
      ) : null}

      {logs.isError ? <Alert tone="danger">{t('errors.network')}</Alert> : null}

      {logs.data && logs.data.data.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-foreground/60">
          {t('admin.audit.empty')}
        </p>
      ) : null}

      {logs.data && logs.data.data.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-foreground/55">
                <th scope="col" className="p-4 text-start font-medium">
                  {t('admin.audit.when')}
                </th>
                <th scope="col" className="p-4 text-start font-medium">
                  {t('admin.audit.actor')}
                </th>
                <th scope="col" className="p-4 text-start font-medium">
                  {t('admin.audit.action')}
                </th>
                <th scope="col" className="p-4 text-start font-medium">
                  {t('admin.audit.entity')}
                </th>
              </tr>
            </thead>
            <tbody>
              {logs.data.data.map((log) => (
                <tr key={log.id} className="border-b border-border/60">
                  <td className="p-4 whitespace-nowrap text-foreground/70">
                    {formatDateTime(log.created_at, locale)}
                  </td>
                  <td className="p-4">
                    {/* A system-triggered mutation has no actor, and the
                        observer deliberately logs none rather than inventing
                        one. */}
                    {log.actor?.full_name ?? (
                      <span className="text-foreground/50">
                        {t('admin.audit.system')}
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    {t(`admin.audit.actions.${log.action}`, {
                      defaultValue: log.action,
                    })}
                  </td>
                  <td className="p-4 whitespace-nowrap" dir="ltr">
                    {log.entity_type} #{log.entity_id}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
