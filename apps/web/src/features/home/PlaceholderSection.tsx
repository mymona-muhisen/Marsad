import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

/**
 * Stands in for a console that a later sprint will build. It exists now so the
 * role guard around it is a real, reachable route rather than untested
 * scaffolding — the guard is the deliverable, this is its subject.
 */
export function PlaceholderSection({ sectionId }: { sectionId: string }) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-4">
      <nav>
        <Link to="/app" className="text-sm text-primary hover:underline">
          {t('common.back')}
        </Link>
      </nav>

      <h1 className="text-2xl font-bold tracking-tight">
        {t(`sections.${sectionId}`)}
      </h1>

      <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-foreground/55">
        {t('home.soon')}
      </p>
    </div>
  )
}
