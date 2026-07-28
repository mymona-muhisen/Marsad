import { useTranslation } from 'react-i18next'

import { Alert } from '@/components/ui/Alert'
import { TextField } from '@/components/ui/TextField'
import { cn } from '@/lib/utils'
import type { ReportDraft } from '../draft'

type Props = {
  draft: ReportDraft
  onChange: (patch: Partial<ReportDraft>) => void
}

export function CounterpartyStep({ draft, onChange }: Props) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h2 className="text-xl font-semibold tracking-tight">
          {t('report.counterparty.title')}
        </h2>
        <p className="mt-2 text-sm leading-7 text-foreground/60">
          {t('report.counterparty.subtitle')}
        </p>
      </header>

      <label
        className={cn(
          'flex min-h-16 cursor-pointer items-start gap-4 rounded-2xl border p-4 transition',
          draft.hitAndRun
            ? 'border-warning bg-warning/10'
            : 'border-border hover:bg-foreground/4',
        )}
      >
        <input
          type="checkbox"
          className="mt-1 size-5 accent-[var(--warning)]"
          checked={draft.hitAndRun}
          onChange={(event) => onChange({ hitAndRun: event.target.checked })}
        />
        <span>
          <span className="block font-medium">
            {t('report.counterparty.hitAndRun')}
          </span>
          <span className="mt-1 block text-sm leading-6 text-foreground/60">
            {t('report.counterparty.hitAndRunHint')}
          </span>
        </span>
      </label>

      {/* The backend drops the counterparty requirement entirely for hit and
          run, so hide the fields rather than showing them disabled. */}
      {draft.hitAndRun ? (
        <Alert tone="warning">{t('report.counterparty.hitAndRunHint')}</Alert>
      ) : (
        <>
          <TextField
            label={t('report.counterparty.phone')}
            placeholder="09XXXXXXXX"
            value={draft.counterpartyPhone}
            onChange={(event) =>
              onChange({ counterpartyPhone: event.target.value })
            }
            type="tel"
            inputMode="numeric"
            dir="ltr"
            className="text-start"
          />

          <TextField
            label={t('report.counterparty.plate')}
            hint={t('report.counterparty.plateHint')}
            value={draft.counterpartyPlate}
            onChange={(event) =>
              onChange({ counterpartyPlate: event.target.value })
            }
            dir="ltr"
            className="text-start"
          />
        </>
      )}
    </div>
  )
}
