import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { FullPageMessage } from '@/components/feedback/FullPageState'

export function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <FullPageMessage
      title={t('common.notFoundTitle')}
      body={t('common.notFoundBody')}
      action={
        <Link
          to="/"
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border px-5 text-sm font-semibold transition hover:bg-foreground/5"
        >
          {t('common.goHome')}
        </Link>
      }
    />
  )
}
