import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router'

import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { TextField } from '@/components/ui/TextField'
import { ApiError } from '@/lib/api/errors'
import { formatDateTime } from '@/lib/format'
import { useLocale } from '@/i18n/useLocale'
import { verifyReport } from './api'

/**
 * UC-07 — public report verification. No login, no personal data: scanning the
 * QR on a printed report lands here and gets a yes/no on authenticity.
 */
export function VerifyReportPage() {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const { qrToken } = useParams()
  const navigate = useNavigate()

  const [token, setToken] = useState('')
  const [inputError, setInputError] = useState<string | null>(null)

  const query = useQuery({
    queryKey: ['reports', 'verify', qrToken],
    queryFn: () => verifyReport(qrToken as string),
    enabled: Boolean(qrToken),
    retry: false,
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = token.trim()

    if (!trimmed) {
      setInputError(t('verify.tokenRequired'))
      return
    }

    setInputError(null)
    void navigate(`/verify/${encodeURIComponent(trimmed)}`)
  }

  const notFound = query.error instanceof ApiError && query.error.isNotFound
  const offline = query.error instanceof ApiError && query.error.isOffline

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-lg flex-col justify-center gap-8 px-5 py-16">
      <header>
        <Link to="/" className="text-sm text-primary hover:underline">
          {t('common.goHome')}
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">
          {t('verify.title')}
        </h1>
        <p className="mt-3 text-sm leading-7 text-foreground/65">
          {t('verify.subtitle')}
        </p>
      </header>

      <form noValidate onSubmit={submit} className="flex flex-col gap-5">
        <TextField
          label={t('verify.tokenLabel')}
          placeholder={t('verify.tokenPlaceholder')}
          value={token}
          onChange={(event) => setToken(event.target.value)}
          error={inputError ?? undefined}
          dir="ltr"
          className="text-start"
        />
        <Button type="submit" size="lg" block>
          {t('verify.submit')}
        </Button>
      </form>

      {query.isFetching ? (
        <p className="flex items-center gap-3 text-sm text-foreground/60">
          <Spinner className="size-4 text-primary" />
          {t('verify.checking')}
        </p>
      ) : null}

      {!query.isFetching && offline ? (
        <Alert tone="danger">{t('errors.network')}</Alert>
      ) : null}

      {!query.isFetching && notFound ? (
        <Alert tone="danger" title={t('verify.notFoundTitle')}>
          {t('verify.notFoundBody')}
        </Alert>
      ) : null}

      {!query.isFetching && query.data ? (
        <Alert
          tone={query.data.status === 'active' ? 'success' : 'warning'}
          title={
            query.data.status === 'active'
              ? t('verify.validTitle')
              : t('verify.supersededTitle')
          }
        >
          <dl className="mt-2 grid gap-2 text-sm">
            <div className="flex gap-2">
              <dt className="text-foreground/55">{t('verify.reportNo')}:</dt>
              <dd className="font-medium" dir="ltr">
                {query.data.report_no}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-foreground/55">{t('verify.issuedAt')}:</dt>
              <dd className="font-medium">
                {formatDateTime(query.data.issued_at, locale)}
              </dd>
            </div>
            {query.data.superseded_by ? (
              <div className="flex gap-2">
                <dt className="text-foreground/55">
                  {t('verify.supersededBy')}:
                </dt>
                <dd className="font-medium" dir="ltr">
                  {query.data.superseded_by}
                </dd>
              </div>
            ) : null}
          </dl>
        </Alert>
      ) : null}

      <p className="text-xs leading-6 text-foreground/45">
        {t('verify.privacyNote')}
      </p>
    </main>
  )
}
