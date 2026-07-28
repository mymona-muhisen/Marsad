import { useEffect, type RefObject } from 'react'

/**
 * Reveals every `[data-reveal]` descendant of `rootRef` once it enters the
 * viewport by flipping `data-revealed="true"` — the transition itself lives in
 * CSS so no React state is involved.
 *
 * Elements stay revealed after the first intersection: re-hiding content on
 * scroll-up is the usual way these effects turn annoying.
 */
export function useRevealOnScroll(rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const targets = root.querySelectorAll<HTMLElement>('[data-reveal]')

    if (typeof IntersectionObserver !== 'function') {
      targets.forEach((el) => el.setAttribute('data-revealed', 'true'))
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.setAttribute('data-revealed', 'true')
          observer.unobserve(entry.target)
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.12 },
    )

    targets.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [rootRef])
}
