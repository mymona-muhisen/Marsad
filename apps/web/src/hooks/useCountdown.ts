import { useEffect, useState } from 'react'

/**
 * Ticks down from a server-provided number of seconds.
 *
 * Deliberately does *not* diff a server deadline against the device clock: a
 * phone with the wrong date — common on the low-end Android devices this
 * platform targets — would then show a citizen the wrong time left to object to
 * a liability decision. The deadline here is derived from the device's own
 * clock plus the server's remaining seconds, so only elapsed time is measured
 * locally and absolute clock skew cannot affect it.
 *
 * `Date.now()` is read only inside the effect and its interval, never during
 * render, which keeps the hook pure.
 */
export function useCountdown(seconds: number): number {
  const [remaining, setRemaining] = useState(seconds)

  useEffect(() => {
    if (seconds <= 0) {
      return
    }

    const deadline = Date.now() + seconds * 1000

    const id = window.setInterval(() => {
      setRemaining(Math.max(0, Math.round((deadline - Date.now()) / 1000)))
    }, 1000)

    return () => window.clearInterval(id)
  }, [seconds])

  // A fresh server figure self-corrects on the next tick, within one second.
  return Math.min(remaining, seconds)
}

/** Splits a second count into whole hours and minutes for display. */
export function splitDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  return {
    hours: Math.floor(minutes / 60),
    minutes: minutes % 60,
  }
}
