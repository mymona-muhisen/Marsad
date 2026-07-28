/**
 * Structural content for the landing page — everything that is *not* text.
 *
 * All user-facing strings live in the lang files under the `landing.*` keys
 * (CLAUDE.md: Arabic strings never hardcoded). What stays here is the shape of
 * each section: asset paths, target routes, and which icon accompanies which
 * item, matched to the lang-file arrays by index.
 */

export const brand = {
  logoSrc: '/logo-mark.png',
} as const

/**
 * The background film. It is purely decorative — every fact on the page is in
 * the text — so the stage is hidden from assistive tech.
 */
export const heroVideo = {
  src: '/accdient.mp4',
} as const

/**
 * Target paths for the page's calls to action. `/report/new` is the accident
 * wizard, which a later sprint builds; the rest are live routes today.
 */
export const routes = {
  report: '/report/new',
  login: '/login',
  verify: '/verify',
} as const

/** In-page anchors; labels come from `nav.*`. */
export const navLinkIds = ['how', 'audiences', 'trust'] as const

/** Icons for `landing.steps.items`, in the same order. */
export const stepIcons = [
  'MapPin',
  'Users',
  'Radar',
  'Scale',
  'FileCheck',
] as const

/** Icons for `landing.audiences.items`, in the same order. */
export const audienceIcons = [
  'CarFront',
  'ClipboardCheck',
  'Gavel',
  'Building2',
  'ShieldCheck',
] as const

/** Icons for `landing.trust.items`, in the same order. */
export const trustIcons = ['Fingerprint', 'QrCode', 'Eye', 'History'] as const

export type LandingItem = {
  title: string
  body: string
}

export type LandingStat = {
  value: string
  unit: string
  label: string
}
