import { type RefObject } from 'react'
import { heroVideo } from './content'

type Props = {
  videoRef: RefObject<HTMLVideoElement | null>
}

/**
 * The pinned film layer. It sticks for the whole length of the landing page
 * while `useScrollScrubbedVideo` advances its frames, so the scene reads as one
 * continuous shot from the first pixel of the page to the last.
 *
 * Every overlay here reads `--scene-progress` (0 at the top of the page, 1 at
 * the bottom) — the film darkens and settles as the reader descends, which is
 * what keeps the text legible over a moving image.
 */
export function ScrollVideoStage({ videoRef }: Props) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none sticky top-0 z-0 h-svh overflow-hidden bg-[#04101b]"
    >
      <video
        ref={videoRef}
        src={heroVideo.src}
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        className="absolute inset-0 h-full w-full object-cover will-change-transform"
        style={{
          // A slow push-out over the scroll keeps the pinned frame from feeling
          // static once the video itself slows down.
          transform:
            'scale(calc(1.12 - var(--scene-progress, 0) * 0.12)) translateZ(0)',
        }}
      />

      {/* Top-and-bottom scrim: permanent, keeps nav and section text readable. */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#04101b]/85 via-[#04101b]/25 to-[#04101b]/90" />

      {/* Progress-driven veil: the page grows calmer and darker as you read. */}
      <div
        className="absolute inset-0 bg-[#04101b]"
        style={{ opacity: 'calc(0.12 + var(--scene-progress, 0) * 0.62)' }}
      />

      {/* Brand wash — pulls the raw footage toward the deep-blue palette. */}
      <div
        className="absolute inset-0 mix-blend-color bg-[#0f2e4f]"
        style={{ opacity: 'calc(0.25 + var(--scene-progress, 0) * 0.35)' }}
      />

      {/* Vignette. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(4,16,27,0.75)_100%)]" />
    </div>
  )
}
