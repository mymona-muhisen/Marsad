import { useId, useState } from 'react'

export type TrendPoint = { date: string; count: number }

const WIDTH = 720
const HEIGHT = 200
const PAD = { top: 12, right: 8, bottom: 26, left: 34 }

/**
 * A single series over time: area, one hue, with a crosshair and tooltip.
 *
 * The hover layer is not optional — an SVG chart on a screen is interactive by
 * nature, and without it a reader cannot recover the value behind any given day.
 * Hit targets are full-height columns rather than the 8px markers, so a point is
 * reachable without precision aiming.
 *
 * Drawn left-to-right with `dir="ltr"` on the figure: a time axis runs earliest
 * to latest regardless of the page's script direction, and mirroring it in RTL
 * would make the trend read backwards.
 */
export function TrendArea({
  points,
  label,
  emptyLabel,
}: {
  points: TrendPoint[]
  label: string
  emptyLabel: string
}) {
  const gradientId = useId()
  const [active, setActive] = useState<number | null>(null)

  if (points.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-foreground/60">
        {emptyLabel}
      </p>
    )
  }

  const plotWidth = WIDTH - PAD.left - PAD.right
  const plotHeight = HEIGHT - PAD.top - PAD.bottom
  const ceiling = Math.max(...points.map((p) => p.count), 1)

  const x = (index: number) =>
    points.length === 1
      ? PAD.left + plotWidth / 2
      : PAD.left + (index / (points.length - 1)) * plotWidth
  const y = (count: number) =>
    PAD.top + plotHeight - (count / ceiling) * plotHeight

  const line = points
    .map((point, index) => `${x(index)},${y(point.count)}`)
    .join(' ')
  const area = `${PAD.left},${PAD.top + plotHeight} ${line} ${x(points.length - 1)},${PAD.top + plotHeight}`

  // Three ticks is enough context for a count axis; more competes with the marks.
  const ticks = [0, Math.round(ceiling / 2), ceiling]
  const activePoint = active === null ? null : points[active]

  return (
    <figure className="m-0 flex flex-col gap-3">
      <div className="relative overflow-x-auto" dir="ltr">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-52 w-full min-w-[36rem]"
          role="img"
          aria-label={label}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--seq-4)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--seq-4)" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={PAD.left}
                x2={WIDTH - PAD.right}
                y1={y(tick)}
                y2={y(tick)}
                stroke="var(--chart-grid)"
                strokeWidth="1"
              />
              <text
                x={PAD.left - 8}
                y={y(tick) + 4}
                textAnchor="end"
                fontSize="11"
                fill="var(--chart-muted)"
              >
                {tick}
              </text>
            </g>
          ))}

          <polygon points={area} fill={`url(#${gradientId})`} />
          <polyline
            points={line}
            fill="none"
            stroke="var(--seq-5)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* First and last date only — a tick per day would collide. */}
          <text
            x={PAD.left}
            y={HEIGHT - 6}
            fontSize="11"
            fill="var(--chart-muted)"
          >
            {points[0].date}
          </text>
          {points.length > 1 ? (
            <text
              x={WIDTH - PAD.right}
              y={HEIGHT - 6}
              textAnchor="end"
              fontSize="11"
              fill="var(--chart-muted)"
            >
              {points[points.length - 1].date}
            </text>
          ) : null}

          {activePoint ? (
            <>
              <line
                x1={x(active!)}
                x2={x(active!)}
                y1={PAD.top}
                y2={PAD.top + plotHeight}
                stroke="var(--chart-axis)"
                strokeWidth="1"
              />
              {/* 2px surface ring keeps the marker legible over the area. */}
              <circle
                cx={x(active!)}
                cy={y(activePoint.count)}
                r="5"
                fill="var(--seq-5)"
                stroke="var(--background)"
                strokeWidth="2"
              />
            </>
          ) : null}

          {points.map((point, index) => (
            <rect
              key={point.date}
              x={x(index) - plotWidth / points.length / 2}
              y={PAD.top}
              width={Math.max(plotWidth / points.length, 6)}
              height={plotHeight}
              fill="transparent"
              onMouseEnter={() => setActive(index)}
              onFocus={() => setActive(index)}
              onMouseLeave={() => setActive(null)}
              onBlur={() => setActive(null)}
              tabIndex={0}
              role="button"
              aria-label={`${point.date}: ${point.count}`}
            />
          ))}
        </svg>
      </div>

      {/* Live region rather than a floating div: it reads out to a screen
          reader and never clips at the edge of the plot. */}
      <figcaption
        className="min-h-6 text-sm text-foreground/70"
        aria-live="polite"
      >
        {activePoint ? (
          <span dir="ltr" className="tabular-nums">
            {activePoint.date} — {activePoint.count}
          </span>
        ) : (
          <span className="text-foreground/45">{label}</span>
        )}
      </figcaption>
    </figure>
  )
}
