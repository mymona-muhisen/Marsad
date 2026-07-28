import { renderHook } from '@testing-library/react'
import { act } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { useScrollScrubbedVideo } from './useScrollScrubbedVideo'

const SCENE_HEIGHT = 4000
const VIEWPORT = 1000

/**
 * jsdom has no layout engine, so the scene's height and its position relative
 * to the viewport are stubbed — that pair is exactly what the hook reads.
 */
function setup() {
  const scene = document.createElement('div')
  const video = document.createElement('video')
  scene.append(video)
  document.body.append(scene)

  Object.defineProperty(scene, 'offsetHeight', {
    configurable: true,
    value: SCENE_HEIGHT,
  })
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    writable: true,
    value: VIEWPORT,
  })

  let scrolled = 0
  scene.getBoundingClientRect = () => ({ top: -scrolled }) as DOMRect

  const scrollTo = (px: number) =>
    act(() => {
      scrolled = px
      window.dispatchEvent(new Event('scroll'))
    })

  const progress = () => scene.style.getPropertyValue('--scene-progress')

  return { scene, video, scrollTo, progress }
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('useScrollScrubbedVideo', () => {
  it('maps the scene’s scroll range onto 0..1 and clamps at both ends', () => {
    const { scene, video, scrollTo, progress } = setup()

    renderHook(() =>
      useScrollScrubbedVideo({
        sceneRef: { current: scene },
        videoRef: { current: video },
      }),
    )

    // Scrollable distance is 4000 - 1000 = 3000.
    expect(progress()).toBe('0.0000')

    scrollTo(1500)
    expect(progress()).toBe('0.5000')

    scrollTo(3000)
    expect(progress()).toBe('1.0000')

    // Over-scroll (rubber-banding) must not push the film past its end.
    scrollTo(5200)
    expect(progress()).toBe('1.0000')
  })

  it('never autoplays the film', () => {
    const { scene, video } = setup()

    renderHook(() =>
      useScrollScrubbedVideo({
        sceneRef: { current: scene },
        videoRef: { current: video },
      }),
    )

    expect(video.muted).toBe(true)
    expect(video.autoplay).toBe(false)
  })

  it('still reports progress when scrubbing is disabled', () => {
    const { scene, video, scrollTo, progress } = setup()

    renderHook(() =>
      useScrollScrubbedVideo({
        sceneRef: { current: scene },
        videoRef: { current: video },
        enabled: false,
      }),
    )

    scrollTo(750)
    expect(progress()).toBe('0.2500')
  })
})
