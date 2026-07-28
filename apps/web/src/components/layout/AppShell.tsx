import { Languages, LogOut, Siren } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, Outlet, useNavigate } from 'react-router'

import { Button } from '@/components/ui/Button'
import { useAuth } from '@/features/auth/useAuth'
import { useLocale } from '@/i18n/useLocale'

export function AppShell() {
  const { t } = useTranslation()
  const { user, signOut } = useAuth()
  const { toggleLocale } = useLocale()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    void navigate('/', { replace: true })
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-5">
          <Link to="/app" className="flex items-center gap-2.5">
            <img src="/logo-mark.png" alt="" className="size-8 object-contain" />
            <span className="font-bold tracking-tight">{t('common.appName')}</span>
          </Link>

          {/* Always one tap away — reporting is why someone opens this app. */}
          <Link
            to="/report/new"
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
          >
            <Siren className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t('nav.report')}</span>
          </Link>

          <div className="ms-auto flex items-center gap-1 sm:gap-2">
            {user?.full_name ? (
              <span className="hidden text-sm text-foreground/60 sm:inline">
                {user.full_name}
              </span>
            ) : null}

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLocale}
              aria-label={t('common.switchLanguage')}
            >
              <Languages className="size-4" aria-hidden="true" />
              {t('common.switchLanguage')}
            </Button>

            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">{t('nav.logout')}</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">
        <Outlet />
      </main>
    </div>
  )
}
