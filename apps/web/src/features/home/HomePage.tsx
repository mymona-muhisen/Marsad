import {
  ArrowLeft,
  Building2,
  CarFront,
  ClipboardCheck,
  Clock,
  Eye,
  FileText,
  Gavel,
  Map,
  Scale,
  Settings,
  ShieldCheck,
  Siren,
  TriangleAlert,
  Wallet,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { useAuth } from '@/features/auth/useAuth'
import { sectionsForRoles } from './sections'

const icons: Record<string, LucideIcon> = {
  Building2,
  CarFront,
  ClipboardCheck,
  Clock,
  Eye,
  FileText,
  Gavel,
  Map,
  Scale,
  Settings,
  ShieldCheck,
  TriangleAlert,
  Wallet,
  Wrench,
}

export function HomePage() {
  const { t } = useTranslation()
  const { user } = useAuth()

  const sections = user ? sectionsForRoles(user.roles) : []

  return (
    <div className="flex flex-col gap-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">
          {user?.full_name
            ? t('home.greeting', { name: user.full_name })
            : t('home.greetingAnonymous')}
        </h1>

        {user ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-foreground/55">
              {t('home.rolesLabel')}:
            </span>
            {user.roles.map((role) => (
              <span
                key={role}
                className="rounded-full border border-border bg-foreground/4 px-3 py-1 text-xs font-medium"
              >
                {t(`roles.${role}`)}
              </span>
            ))}
          </div>
        ) : null}
      </header>

      {/* The platform's core action. It used to live only on the public
          landing page, which a signed-in user never sees again. */}
      <section className="rounded-2xl border border-primary/25 bg-primary/8 p-6 sm:p-8">
        <h2 className="text-xl font-semibold tracking-tight">
          {t('home.reportTitle')}
        </h2>
        <p className="mt-2 max-w-prose text-sm leading-7 text-foreground/65">
          {t('home.reportBody')}
        </p>
        <Link
          to="/report/new"
          className="mt-6 inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-primary px-7 font-semibold text-primary-foreground transition hover:brightness-110"
        >
          <Siren className="size-5" aria-hidden="true" />
          {t('nav.report')}
        </Link>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-foreground/55">
          {t('home.sectionsLabel')}
        </h2>

        {sections.length === 0 ? (
          <p className="text-sm text-foreground/60">{t('home.empty')}</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sections.map((section) => {
              const Icon = icons[section.icon]
              return (
                <li key={section.id}>
                  <Link
                    to={section.path}
                    className="group flex h-full items-center gap-4 rounded-2xl border border-border bg-background p-5 transition hover:border-primary/40 hover:bg-primary/4"
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      {Icon ? <Icon className="size-5" aria-hidden="true" /> : null}
                    </span>
                    <span className="font-medium">{t(`sections.${section.id}`)}</span>
                    <ArrowLeft
                      className="ms-auto size-4 text-foreground/30 transition-transform group-hover:-translate-x-1 rtl:rotate-0 ltr:rotate-180"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
