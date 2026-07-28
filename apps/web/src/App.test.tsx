import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/test/utils'
import { heroVideo, routes } from '@/components/landing/content'
import ar from '@/i18n/locales/ar.json'
import App from './App'

describe('landing route', () => {
  it('renders the hero headline in Arabic', () => {
    renderWithProviders(<App />, { route: '/' })

    expect(
      screen.getByRole('heading', { level: 1, name: /من مكان الحادث/ }),
    ).toBeInTheDocument()
  })

  it('mounts the scroll-driven background film', () => {
    const { container } = renderWithProviders(<App />, { route: '/' })
    const video = container.querySelector('video')

    expect(video).toHaveAttribute('src', heroVideo.src)
    // React reflects `muted` as a property rather than an attribute.
    expect(video?.muted).toBe(true)
    // Autoplay is never used: the scene is driven by scroll position only.
    expect(video).not.toHaveAttribute('autoplay')
    expect(video).not.toHaveAttribute('loop')
  })

  it('points every report call-to-action at the reporting route', () => {
    renderWithProviders(<App />, { route: '/' })
    const ctas = screen.getAllByRole('link', {
      name: ar.landing.hero.primaryCta,
    })

    expect(ctas.length).toBeGreaterThan(0)
    ctas.forEach((cta) => expect(cta).toHaveAttribute('href', routes.report))
  })

  it('renders every step from the lang file', () => {
    renderWithProviders(<App />, { route: '/' })

    ar.landing.steps.items.forEach((step) => {
      expect(
        screen.getByRole('heading', { level: 3, name: step.title }),
      ).toBeInTheDocument()
    })
  })

  it('serves an unknown path as not found', () => {
    renderWithProviders(<App />, { route: '/no-such-page' })

    expect(
      screen.getByRole('heading', { name: ar.common.notFoundTitle }),
    ).toBeInTheDocument()
  })
})
