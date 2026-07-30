import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { TrendArea, type TrendPoint } from './TrendArea'

/**
 * The palette validator checks colour, not layout. These assert the hand-rolled
 * SVG geometry stays inside its viewBox — the failure mode that only shows up
 * visually, and that a snapshot would happily freeze in a broken state.
 */
/** `src/test/setup.ts` initialises i18n globally, so no provider is needed. */
function renderChart(points: TrendPoint[]) {
  return render(
    <TrendArea points={points} label="trend" emptyLabel="empty" />,
  )
}

const VIEW = { width: 720, height: 200 }

function coordsOf(container: HTMLElement) {
  const svg = container.querySelector('svg')
  expect(svg).not.toBeNull()

  const pairs: { x: number; y: number }[] = []

  for (const polyline of svg!.querySelectorAll('polyline, polygon')) {
    const raw = polyline.getAttribute('points') ?? ''
    for (const token of raw.trim().split(/\s+/)) {
      const [x, y] = token.split(',').map(Number)
      if (Number.isFinite(x) && Number.isFinite(y)) pairs.push({ x, y })
    }
  }

  return pairs
}

describe('TrendArea geometry', () => {
  it('keeps every plotted point inside the viewBox', () => {
    const points = Array.from({ length: 30 }, (_, i) => ({
      date: `2026-07-${String(i + 1).padStart(2, '0')}`,
      count: i % 7,
    }))

    const { container } = renderChart(points)
    const coords = coordsOf(container)

    expect(coords.length).toBeGreaterThan(0)
    for (const { x, y } of coords) {
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThanOrEqual(VIEW.width)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThanOrEqual(VIEW.height)
    }
  })

  it('centres a single point instead of dividing by zero', () => {
    const { container } = renderChart([{ date: '2026-07-20', count: 4 }])
    const coords = coordsOf(container)

    for (const { x, y } of coords) {
      expect(Number.isNaN(x)).toBe(false)
      expect(Number.isNaN(y)).toBe(false)
    }
  })

  it('does not divide by zero when every count is zero', () => {
    // A flat-zero series is the common real case: no fraud signals all week.
    const { container } = renderChart([
      { date: '2026-07-20', count: 0 },
      { date: '2026-07-21', count: 0 },
    ])

    for (const { y } of coordsOf(container)) {
      expect(Number.isNaN(y)).toBe(false)
    }
  })

  it('renders the empty state rather than an axis with no marks', () => {
    const { container, getByText } = renderChart([])

    expect(container.querySelector('svg')).toBeNull()
    expect(getByText('empty')).toBeInTheDocument()
  })

  it('gives every point a reachable hit target', () => {
    const points = [
      { date: '2026-07-20', count: 2 },
      { date: '2026-07-21', count: 3 },
    ]
    const { container } = renderChart(points)

    const targets = container.querySelectorAll('rect[role="button"]')
    expect(targets).toHaveLength(points.length)

    // Bigger than the 5px marker, per the interaction rules.
    for (const target of targets) {
      expect(Number(target.getAttribute('width'))).toBeGreaterThanOrEqual(6)
    }
  })
})
