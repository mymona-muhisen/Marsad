import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'
import type { CaseStatus, ClaimStatus } from '@/lib/api/types'

/**
 * Status chips for the 12 case states and 8 claim states (design brief:
 * "design a status chip system", "status colors map 1:1 to case/claim states").
 *
 * Tones come from the design tokens, never raw hex, so a palette change moves
 * every chip at once. Meaning is never carried by colour alone — the label is
 * always present, which is what keeps this readable at WCAG AA and for
 * colour-blind users.
 */
type Tone = 'neutral' | 'progress' | 'waiting' | 'done' | 'stopped'

const TONE_CLASSES: Record<Tone, string> = {
  neutral: 'border-foreground/15 bg-foreground/6 text-foreground/70',
  progress: 'border-primary/25 bg-primary/10 text-primary',
  waiting: 'border-warning/30 bg-warning/12 text-warning',
  done: 'border-success/30 bg-success/12 text-success',
  stopped: 'border-danger/30 bg-danger/12 text-danger',
}

const CASE_TONES: Record<CaseStatus, Tone> = {
  draft: 'neutral',
  submitted: 'progress',
  under_review: 'progress',
  // Nothing moves until the other driver joins — that is a wait, not progress.
  awaiting_counterparty: 'waiting',
  evidence_complete: 'progress',
  adjudication: 'progress',
  decision_issued: 'progress',
  objection_window: 'waiting',
  final: 'done',
  closed: 'neutral',
  cancelled: 'neutral',
  escalated: 'stopped',
}

const CLAIM_TONES: Record<ClaimStatus, Tone> = {
  opened: 'progress',
  info_requested: 'waiting',
  assessing: 'progress',
  approved: 'done',
  partially_approved: 'waiting',
  rejected: 'stopped',
  settled: 'done',
  closed: 'neutral',
}

type Props = {
  status: CaseStatus | ClaimStatus
  kind?: 'case' | 'claim'
  className?: string
}

export function StatusChip({ status, kind = 'case', className }: Props) {
  const { t } = useTranslation()

  const tone =
    kind === 'claim'
      ? CLAIM_TONES[status as ClaimStatus]
      : CASE_TONES[status as CaseStatus]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap',
        TONE_CLASSES[tone ?? 'neutral'],
        className,
      )}
    >
      {t(`${kind === 'claim' ? 'claimStatus' : 'caseStatus'}.${status}`)}
    </span>
  )
}
