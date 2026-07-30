import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

/**
 * A single headline number. Used instead of a one-bar bar chart — a lone value
 * is not a comparison, and drawing it as a bar invites the reader to compare it
 * with nothing.
 */
export function StatTile({
  label,
  value,
  unit,
  hint,
  tone = 'neutral',
  className,
}: {
  label: string
  value: string | number
  unit?: string
  hint?: ReactNode
  tone?: 'neutral' | 'good' | 'warning' | 'critical'
  className?: string
}) {
  const valueTone = {
    // Ink tokens, not series colors: the number is text.
    neutral: 'text-foreground',
    good: 'text-success',
    warning: 'text-warning',
    critical: 'text-danger',
  }[tone]

  return (
    <div className={cn('rounded-2xl border border-border p-5', className)}>
      <p className="text-sm text-foreground/60">{label}</p>
      <p className="mt-2 flex items-baseline gap-1.5">
        <span className={cn('text-4xl font-bold tracking-tight', valueTone)}>
          {value}
        </span>
        {unit ? (
          <span className="text-sm font-medium text-foreground/55">{unit}</span>
        ) : null}
      </p>
      {hint ? (
        <p className="mt-2 text-xs leading-6 text-foreground/50">{hint}</p>
      ) : null}
    </div>
  )
}
