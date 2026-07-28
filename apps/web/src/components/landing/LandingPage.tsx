import { useEffect, useRef, useState, type CSSProperties } from 'react'
import {
  ArrowLeft,
  Building2,
  CarFront,
  ChevronDown,
  ClipboardCheck,
  Eye,
  FileCheck,
  Fingerprint,
  Gavel,
  History,
  Languages,
  MapPin,
  QrCode,
  Radar,
  Scale,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { cn } from '@/lib/utils'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { useRevealOnScroll } from '@/hooks/useRevealOnScroll'
import { useScrollScrubbedVideo } from '@/hooks/useScrollScrubbedVideo'
import { useLocale } from '@/i18n/useLocale'
import { useTranslatedList } from '@/i18n/useTranslatedList'
import { ScrollVideoStage } from './ScrollVideoStage'
import {
  audienceIcons,
  brand,
  navLinkIds,
  routes,
  stepIcons,
  trustIcons,
  type LandingItem,
  type LandingStat,
} from './content'

const icons: Record<string, LucideIcon> = {
  Building2,
  CarFront,
  ClipboardCheck,
  Eye,
  FileCheck,
  Fingerprint,
  Gavel,
  History,
  MapPin,
  QrCode,
  Radar,
  Scale,
  ShieldCheck,
  Users,
}

/** Staggers a reveal so items in a group cascade instead of popping together. */
const delay = (ms: number) => ({ '--reveal-delay': `${ms}ms` }) as CSSProperties

const glass =
  'rounded-3xl border border-white/10 bg-white/[0.055] backdrop-blur-xl'

const linkButton =
  'inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white/90 backdrop-blur-md transition hover:border-white/40 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:text-base'

const primaryLinkButton =
  'group inline-flex items-center justify-center gap-2 rounded-full bg-[#1f4e79] px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#0a1f33]/50 transition hover:bg-[#2c5f8a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:text-base'

// ---------------------------------------------------------------------------

function Eyebrow({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium tracking-wide text-white/75 backdrop-blur-md">
      <span className="size-1.5 rounded-full bg-accent" />
      {children}
    </span>
  )
}

function SectionHeading({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string
  title: string
  body?: string
}) {
  return (
    <div className="max-w-2xl">
      <div data-reveal>
        <Eyebrow>{eyebrow}</Eyebrow>
      </div>
      <h2
        data-reveal
        style={delay(80)}
        className="mt-6 text-balance text-[clamp(1.9rem,4.6vw,3.25rem)] font-bold leading-[1.2] tracking-tight"
      >
        {title}
      </h2>
      {body ? (
        <p
          data-reveal
          style={delay(160)}
          className="mt-5 text-pretty text-base leading-8 text-white/70 sm:text-lg"
        >
          {body}
        </p>
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------

function LandingNav() {
  const { t } = useTranslation()
  const { toggleLocale } = useLocale()
  // Reading the initial value lazily covers a reload part-way down the page.
  const [lifted, setLifted] = useState(() => window.scrollY > 24)

  useEffect(() => {
    const onScroll = () => setLifted(window.scrollY > 24)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-colors duration-300',
        lifted && 'border-b border-white/10 bg-[#04101b]/70 backdrop-blur-xl',
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-5 sm:h-18 sm:px-8">
        <a href="#top" className="flex shrink-0 items-center gap-2.5">
          <img
            src={brand.logoSrc}
            alt=""
            className="size-9 object-contain drop-shadow-[0_0_12px_rgba(52,199,173,0.35)]"
          />
          <span className="text-lg font-bold tracking-tight text-white">
            {t('common.appName')}
          </span>
        </a>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinkIds.map((id) => (
            <a
              key={id}
              href={`#${id}`}
              className="rounded-full px-4 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              {t(`nav.${id}`)}
            </a>
          ))}
        </nav>

        <div className="me-0 ms-auto flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={toggleLocale}
            className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-sm text-white/70 transition hover:text-white sm:inline-flex"
          >
            <Languages className="size-4" aria-hidden="true" />
            {t('common.switchLanguage')}
          </button>

          <Link
            to={routes.verify}
            className="hidden rounded-full px-4 py-2 text-sm text-white/70 transition hover:text-white lg:inline-flex"
          >
            {t('nav.verify')}
          </Link>
          <Link
            to={routes.login}
            className="rounded-full px-4 py-2 text-sm text-white/80 transition hover:text-white"
          >
            {t('nav.login')}
          </Link>
          <Link
            to={routes.report}
            className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#0a2540] transition hover:bg-white/90"
          >
            {t('nav.report')}
          </Link>
        </div>
      </div>
    </header>
  )
}

// ---------------------------------------------------------------------------

function Hero() {
  const { t } = useTranslation()

  return (
    <section
      id="top"
      className="relative flex min-h-svh flex-col justify-end px-5 pb-16 pt-32 sm:px-8 sm:pb-24"
    >
      <div className="mx-auto w-full max-w-7xl">
        <div data-reveal>
          <Eyebrow>{t('landing.hero.eyebrow')}</Eyebrow>
        </div>

        <h1
          data-reveal
          style={delay(100)}
          className="mt-7 max-w-4xl text-balance text-[clamp(2.4rem,7.5vw,5rem)] font-bold leading-[1.08] tracking-tight"
        >
          {t('landing.hero.title')}{' '}
          <span className="bg-gradient-to-l from-accent via-accent-soft to-gold bg-clip-text text-transparent">
            {t('landing.hero.titleAccent')}
          </span>
        </h1>

        <p
          data-reveal
          style={delay(220)}
          className="mt-7 max-w-2xl text-pretty text-base leading-8 text-white/75 sm:text-xl sm:leading-9"
        >
          {t('landing.hero.subtitle')}
        </p>

        <div
          data-reveal
          style={delay(320)}
          className="mt-10 flex flex-wrap items-center gap-3 sm:gap-4"
        >
          <Link to={routes.report} className={primaryLinkButton}>
            {t('landing.hero.primaryCta')}
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1 ltr:rotate-180" />
          </Link>
          <a href="#how" className={linkButton}>
            {t('landing.hero.secondaryCta')}
          </a>
        </div>

        <div
          data-reveal
          style={delay(460)}
          className="mt-16 flex items-center gap-3 text-xs text-white/45"
        >
          <ChevronDown className="size-4 motion-safe:animate-bounce" />
          {t('landing.hero.scrollHint')}
        </div>
      </div>
    </section>
  )
}

function Stats() {
  const items = useTranslatedList<LandingStat>('landing.stats.items')

  return (
    <section className="px-5 py-8 sm:px-8">
      <div
        className={cn(
          glass,
          'mx-auto grid max-w-7xl grid-cols-2 gap-px overflow-hidden lg:grid-cols-4',
        )}
      >
        {items.map((item, i) => (
          <div
            key={item.label}
            data-reveal
            style={delay(i * 90)}
            className="p-6 sm:p-8"
          >
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-bold tabular-nums tracking-tight text-white sm:text-5xl">
                {item.value}
              </span>
              <span className="text-sm font-medium text-accent">{item.unit}</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-white/60">{item.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function Problem() {
  const { t } = useTranslation()
  const points = useTranslatedList<string>('landing.problem.points')

  return (
    <section className="px-5 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:gap-20">
        <SectionHeading
          eyebrow={t('landing.problem.eyebrow')}
          title={t('landing.problem.title')}
          body={t('landing.problem.body')}
        />
        <ul className="space-y-3 lg:pt-24">
          {points.map((point, i) => (
            <li
              key={point}
              data-reveal
              style={delay(i * 90)}
              className={cn(
                glass,
                'flex items-start gap-4 p-5 text-sm leading-7 text-white/80 sm:text-base',
              )}
            >
              <span className="mt-1.5 size-2 shrink-0 rounded-full bg-[#c62828]/80" />
              {point}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function Steps() {
  const { t } = useTranslation()
  const items = useTranslatedList<LandingItem>('landing.steps.items')

  return (
    <section id="how" className="scroll-mt-24 px-5 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow={t('landing.steps.eyebrow')}
          title={t('landing.steps.title')}
        />

        <ol className="relative mt-16 space-y-4 border-e border-white/10 pe-6 sm:pe-10">
          {items.map((step, i) => {
            const Icon = icons[stepIcons[i] ?? '']
            return (
              <li
                key={step.title}
                data-reveal
                style={delay(i * 100)}
                className="relative"
              >
                {/* Node on the timeline rail. */}
                <span className="absolute -end-[1.65rem] top-8 hidden size-3 rounded-full border-2 border-[#04101b] bg-accent sm:-end-[2.65rem] sm:block" />

                <div
                  className={cn(
                    glass,
                    'flex flex-col gap-5 p-6 transition-colors duration-300 hover:border-white/25 hover:bg-white/[0.09] sm:flex-row sm:items-start sm:gap-7 sm:p-8',
                  )}
                >
                  <div className="flex items-center gap-4 sm:flex-col sm:gap-3">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#1f4e79]/70 text-accent-soft ring-1 ring-inset ring-white/10">
                      {Icon ? <Icon className="size-5" /> : null}
                    </span>
                    <span className="text-sm font-bold tabular-nums text-white/25">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">
                      {step.title}
                    </h3>
                    <p className="mt-3 max-w-2xl text-pretty text-sm leading-8 text-white/70 sm:text-base">
                      {step.body}
                    </p>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}

function Audiences() {
  const { t } = useTranslation()
  const items = useTranslatedList<LandingItem>('landing.audiences.items')

  return (
    <section id="audiences" className="scroll-mt-24 px-5 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow={t('landing.audiences.eyebrow')}
          title={t('landing.audiences.title')}
        />

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => {
            const Icon = icons[audienceIcons[i] ?? '']
            return (
              <article
                key={item.title}
                data-reveal
                style={delay(i * 80)}
                className={cn(
                  glass,
                  'group p-7 transition-colors duration-300 hover:border-white/25 hover:bg-white/[0.09]',
                )}
              >
                <span className="flex size-11 items-center justify-center rounded-2xl bg-white/8 text-accent-soft ring-1 ring-inset ring-white/10 transition-colors group-hover:bg-[#1f4e79]/60">
                  {Icon ? <Icon className="size-5" /> : null}
                </span>
                <h3 className="mt-6 text-lg font-semibold tracking-tight">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-white/65">{item.body}</p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function Trust() {
  const { t } = useTranslation()
  const items = useTranslatedList<LandingItem>('landing.trust.items')

  return (
    <section id="trust" className="scroll-mt-24 px-5 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow={t('landing.trust.eyebrow')}
          title={t('landing.trust.title')}
          body={t('landing.trust.body')}
        />

        <div className="mt-16 grid gap-4 md:grid-cols-2">
          {items.map((item, i) => {
            const Icon = icons[trustIcons[i] ?? '']
            return (
              <article
                key={item.title}
                data-reveal
                style={delay(i * 90)}
                className={cn(glass, 'flex gap-5 p-7 sm:p-8')}
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#0e7c6b]/25 text-accent-soft ring-1 ring-inset ring-accent/25">
                  {Icon ? <Icon className="size-5" /> : null}
                </span>
                <div>
                  <h3 className="text-lg font-semibold tracking-tight">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-white/65">
                    {item.body}
                  </p>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function FinalCta() {
  const { t } = useTranslation()

  return (
    <section className="px-5 py-28 sm:px-8 sm:py-40">
      <div className="mx-auto max-w-3xl text-center">
        <h2
          data-reveal
          className="text-balance text-[clamp(2rem,5.5vw,3.75rem)] font-bold leading-[1.15] tracking-tight"
        >
          {t('landing.finalCta.title')}
        </h2>
        <p
          data-reveal
          style={delay(100)}
          className="mt-6 text-pretty text-base leading-8 text-white/70 sm:text-lg"
        >
          {t('landing.finalCta.body')}
        </p>
        <div
          data-reveal
          style={delay(200)}
          className="mt-10 flex flex-wrap justify-center gap-3 sm:gap-4"
        >
          <Link to={routes.report} className={primaryLinkButton}>
            {t('landing.finalCta.primary')}
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1 ltr:rotate-180" />
          </Link>
          <Link to={routes.verify} className={linkButton}>
            {t('landing.finalCta.secondary')}
          </Link>
        </div>
      </div>
    </section>
  )
}

const FOOTER_COLUMNS = [
  { title: 'landing.footer.platform', links: 'landing.footer.platformLinks' },
  { title: 'landing.footer.services', links: 'landing.footer.servicesLinks' },
  { title: 'landing.footer.partners', links: 'landing.footer.partnersLinks' },
] as const

function FooterColumn({ titleKey, linksKey }: { titleKey: string; linksKey: string }) {
  const { t } = useTranslation()
  const links = useTranslatedList<string>(linksKey)

  return (
    <div>
      <h3 className="text-sm font-semibold text-white">{t(titleKey)}</h3>
      <ul className="mt-4 space-y-3">
        {links.map((link) => (
          <li key={link}>
            <a
              href="#top"
              className="text-sm text-white/55 transition hover:text-white"
            >
              {link}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Footer() {
  const { t } = useTranslation()

  return (
    <footer className="border-t border-white/10 bg-[#04101b]/80 px-5 py-16 backdrop-blur-xl sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div>
            <div className="flex items-center gap-3">
              <img src={brand.logoSrc} alt="" className="size-10 object-contain" />
              <div>
                <p className="text-lg font-bold tracking-tight">
                  {t('common.appName')}
                </p>
                <p className="text-xs tracking-[0.25em] text-white/40">
                  {t('common.appLatin').toUpperCase()}
                </p>
              </div>
            </div>
            <p className="mt-5 max-w-xs text-sm leading-7 text-white/55">
              {t('common.tagline')}
            </p>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <FooterColumn
              key={column.title}
              titleKey={column.title}
              linksKey={column.links}
            />
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-2 border-t border-white/10 pt-7 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {t('common.appName')} —{' '}
            {t('landing.footer.legal')}
          </p>
          <p>{t('landing.footer.note')}</p>
        </div>
      </div>
    </footer>
  )
}

// ---------------------------------------------------------------------------

/**
 * Public landing page (unauthenticated visitors).
 *
 * The whole page is one scroll scene: a pinned video sits behind the content
 * and its timeline is bound to scroll position, so the film runs from the very
 * top of the page to the very bottom and never plays on its own.
 */
export function LandingPage() {
  const sceneRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const prefersReducedMotion = usePrefersReducedMotion()

  useScrollScrubbedVideo({
    sceneRef,
    videoRef,
    enabled: !prefersReducedMotion,
  })
  useRevealOnScroll(sceneRef)

  return (
    <div
      ref={sceneRef}
      className="relative isolate bg-[#04101b] text-white selection:bg-accent/30"
    >
      <ScrollVideoStage videoRef={videoRef} />

      {/* Pulled back over the pinned stage so the film reads as the page's
          background for its entire length. */}
      <div className="relative z-10 -mt-[100svh]">
        <LandingNav />
        <main>
          <Hero />
          <Stats />
          <Problem />
          <Steps />
          <Audiences />
          <Trust />
          <FinalCta />
        </main>
        <Footer />
      </div>
    </div>
  )
}
