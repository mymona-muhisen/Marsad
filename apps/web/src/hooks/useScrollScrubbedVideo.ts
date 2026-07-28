import { useEffect, type RefObject } from 'react'

type Options = {
  /** The element whose scroll range maps to the full video timeline. */
  sceneRef: RefObject<HTMLElement | null>
  videoRef: RefObject<HTMLVideoElement | null>
  /** When false the video is parked on a single frame and never scrubs. */
  enabled?: boolean
  /** 0..1 — how aggressively the rendered frame chases the scroll target. */
  smoothing?: number
  /** Frame (as a fraction of duration) shown when scrubbing is disabled. */
  staticFrame?: number
}

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n)

/**
 * Apple-style scroll scrubbing: the page's scroll position drives
 * `video.currentTime` instead of the video playing on its own clock.
 *
 * Two things are kept off the React render path deliberately — the video seek
 * and the `--scene-progress` custom property — so scrolling never triggers a
 * re-render. Anything that needs to animate with the scroll reads the CSS
 * variable instead of subscribing to state.
 */
export function useScrollScrubbedVideo({
  sceneRef,
  videoRef,
  enabled = true,
  smoothing = 0.18,
  staticFrame = 0.45,
}: Options) {
  useEffect(() => {
    const scene = sceneRef.current
    const video = videoRef.current
    if (!scene || !video) return

    // Autoplay policies only allow programmatic control of muted inline video,
    // and the attribute alone is not always honoured on iOS.
    video.muted = true
    video.playsInline = true
    video.pause()

    let duration = 0
    let targetTime = 0
    let renderedTime = 0
    let frame = 0
    let running = false
    let disposed = false

    const readProgress = () => {
      const scrollable = scene.offsetHeight - window.innerHeight
      if (scrollable <= 0) return 0
      return clamp01(-scene.getBoundingClientRect().top / scrollable)
    }

    const publishProgress = (progress: number) => {
      scene.style.setProperty('--scene-progress', progress.toFixed(4))
    }

    const seek = (time: number) => {
      // Skip the write while a seek is in flight: dropping a frame keeps the
      // pipeline responsive, whereas queueing seeks makes scrubbing lag behind.
      if (video.readyState < 1 /* HAVE_METADATA */ || video.seeking) return
      video.currentTime = time
    }

    const tick = () => {
      const delta = targetTime - renderedTime
      if (Math.abs(delta) < 0.005) {
        renderedTime = targetTime
        seek(renderedTime)
        running = false
        return
      }
      renderedTime += delta * smoothing
      seek(renderedTime)
      frame = requestAnimationFrame(tick)
    }

    const requestTick = () => {
      if (running || disposed) return
      running = true
      frame = requestAnimationFrame(tick)
    }

    const onScroll = () => {
      const progress = readProgress()
      publishProgress(progress)
      if (!enabled || !duration) return
      targetTime = progress * duration
      requestTick()
    }

    const onMetadata = () => {
      duration = Number.isFinite(video.duration) ? video.duration : 0
      if (!duration) return
      if (!enabled) {
        renderedTime = targetTime = duration * staticFrame
        seek(renderedTime)
        return
      }
      onScroll()
    }

    /**
     * Safari/iOS will not paint a seeked frame for a video that has never been
     * handed to the decoder, so kick it once and immediately stop.
     */
    const prime = () => {
      const started = video.play()
      if (started && typeof started.then === 'function') {
        started.then(() => video.pause()).catch(() => undefined)
      } else {
        video.pause()
      }
    }

    video.addEventListener('loadedmetadata', onMetadata)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    window.addEventListener('orientationchange', onScroll)
    document.addEventListener('touchstart', prime, { once: true, passive: true })

    if (video.readyState >= 1) onMetadata()
    prime()
    onScroll()

    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      video.removeEventListener('loadedmetadata', onMetadata)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      window.removeEventListener('orientationchange', onScroll)
      document.removeEventListener('touchstart', prime)
    }
  }, [sceneRef, videoRef, enabled, smoothing, staticFrame])
}
