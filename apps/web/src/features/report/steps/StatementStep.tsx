import { useTranslation } from 'react-i18next'

import { Alert } from '@/components/ui/Alert'
import { Textarea } from '@/components/ui/Textarea'
import type { ReportDraft } from '../draft'

type Props = {
  draft: ReportDraft
  onChange: (patch: Partial<ReportDraft>) => void
}

export function StatementStep({ draft, onChange }: Props) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold tracking-tight">
        {t('report.statement.title')}
      </h2>

      <Textarea
        label={t('report.statement.label')}
        placeholder={t('report.statement.placeholder')}
        hint={t('report.statement.counter', { count: draft.statement.length })}
        maxLength={2000}
        value={draft.statement}
        onChange={(event) => onChange({ statement: event.target.value })}
      />

      {/* The API accepts a voice statement, but only in mp3/wav/m4a/ogg —
          browser MediaRecorder produces webm in Chrome, so recording is
          deferred rather than shipped half-working. */}
      <Alert tone="info">{t('report.statement.voiceSoon')}</Alert>
    </div>
  )
}
