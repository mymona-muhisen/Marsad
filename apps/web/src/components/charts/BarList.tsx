import { cn } from '@/lib/utils'

export type BarDatum = {
  key: string
  label: string
  value: number
  /** Rendered instead of the raw value when the number needs a unit. */
  display?: string
}

/**
 * Horizontal magnitude bars.
 *
 * Horizontal because every category here is a long Arabic name — an insurer or a
 * governorate — which a column chart would either clip or turn on its side.
 *
 * One sequential hue, darker with magnitude: these are ranked quantities of the
 * same thing, not distinct series, so categorical hues would imply a difference
 * in kind that isn't there. Each bar is directly labelled, so the reading never
 * depends on colour.
 */
export function BarList({
  data,
  max,
  className,
  emphasise,
}: {
  data: BarDatum[]
  /** Fixed scale across renders; defaults to the largest value present. */
  max?: number
  className?: string
  /** Keys drawn in the critical status colour, with a label to say why. */
  emphasise?: { keys: string[]; label: string }
}) {
  const ceiling = Math.max(max ?? 0, ...data.map((d) => d.value), 1)

  // Darker = larger, in five steps.
  const stepFor = (value: number) => {
    const ratio = value / ceiling
    if (ratio > 0.8) return 'bg-seq-5'
    if (ratio > 0.6) return 'bg-seq-4'
    if (ratio > 0.4) return 'bg-seq-3'
    if (ratio > 0.2) return 'bg-seq-2'
    return 'bg-seq-1'
  }

  return (
    <ul className={cn('flex flex-col gap-4', className)}>
      {data.map((datum) => {
        const flagged = emphasise?.keys.includes(datum.key) ?? false
        const width = `${Math.max((datum.value / ceiling) * 100, datum.value > 0 ? 1.5 : 0)}%`

        return (
          <li key={datum.key} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-sm font-medium">{datum.label}</span>
              <span
                className="text-sm font-semibold tabular-nums"
                dir="ltr"
              >
                {datum.display ?? datum.value}
              </span>
            </div>

            {/* Track in the surface, so an empty bar still shows its lane. */}
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-foreground/6">
              <div
                className={cn(
                  'h-full rounded-full',
                  flagged ? 'bg-danger' : stepFor(datum.value),
                )}
                style={{ width }}
              />
            </div>

            {flagged && emphasise ? (
              <span className="text-xs font-medium text-danger">
                {emphasise.label}
              </span>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
