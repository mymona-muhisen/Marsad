import { useCallback, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { CircleCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useParams } from 'react-router'

import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { Textarea } from '@/components/ui/Textarea'
import { useAuth } from '@/features/auth/useAuth'
import { PhotosStep } from '@/features/report/steps/PhotosStep'
import { PHOTO_SLOTS, type PhotoSlot } from '@/features/report/steps'
import { newIdempotencyKey } from '@/lib/idempotency'
import { ApiError } from '@/lib/api/errors'
import { formatDateTime } from '@/lib/format'
import { useLocale } from '@/i18n/useLocale'
import { fetchJoinTeaser, joinTeaserQueryKey, submitJoin } from './api'

type Step = 'photos' | 'statement'

/**
 * The counterparty deep link (UC-02 step 3).
 *
 * The second driver receives an SMS with a signed token and lands here without
 * an account. This is the anti-fraud centrepiece of the intake design — one
 * case carrying two independent accounts — so the page is careful about one
 * thing above all: it never shows the reporter's statement. The teaser endpoint
 * withholds it server-side, and the page says why, so the counterparty writes
 * what they saw rather than a rebuttal.
 */
export function JoinCasePage() {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const { token = '' } = useParams()
  const location = useLocation()
  const { user, status } = useAuth()

  const [step, setStep] = useState<Step>('photos')
  const [photos, setPhotos] = useState<Partial<Record<PhotoSlot, File>>>({})
  const [extraPhotos, setExtraPhotos] = useState<File[]>([])
  /**
   * Minted per slot on first capture and reused on a retake, so a retried
   * submit after a dropped connection dedups against the same evidence rows.
   * In memory only — this flow is two steps against a 24h token, not a draft.
   */
  const [photoKeys, setPhotoKeys] = useState<Record<string, string>>({})
  const [extraKeys, setExtraKeys] = useState<string[]>([])
  const [statement, setStatement] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [joinedCaseNo, setJoinedCaseNo] = useState<string | null>(null)

  const teaser = useQuery({
    queryKey: joinTeaserQueryKey(token),
    queryFn: () => fetchJoinTeaser(token),
    enabled: token.length > 0,
    retry: false,
  })

  const setSlot = useCallback((slot: PhotoSlot, file: File) => {
    setPhotos((current) => ({ ...current, [slot]: file }))
    setPhotoKeys((current) =>
      current[slot] ? current : { ...current, [slot]: newIdempotencyKey() },
    )
    setError(null)
  }, [])

  const addExtra = useCallback((file: File) => {
    setExtraPhotos((current) => [...current, file])
    setExtraKeys((current) => [...current, newIdempotencyKey()])
  }, [])

  const removeExtra = useCallback((index: number) => {
    setExtraPhotos((current) => current.filter((_, i) => i !== index))
    setExtraKeys((current) => current.filter((_, i) => i !== index))
  }, [])

  const mutation = useMutation({
    mutationFn: submitJoin,
    onSuccess: (result) => {
      setError(null)
      setJoinedCaseNo(result.data.case_no)
    },
    onError: (cause) => {
      if (cause instanceof ApiError && cause.isOffline) {
        setError(t('errors.network'))
        return
      }
      // The server rejects a phone that does not match the reported party;
      // its own message is clearer than a generic failure.
      if (cause instanceof ApiError && cause.fieldError('phone')) {
        setError(t('join.phoneMismatch'))
        return
      }
      setError(
        cause instanceof ApiError && cause.message
          ? cause.message
          : t('join.submitFailed'),
      )
    },
  })

  if (status === 'loading' || teaser.isPending) {
    return (
      <main className="mx-auto flex max-w-2xl items-center gap-3 p-6 text-sm text-foreground/60">
        <Spinner className="size-4 text-primary" />
        {t('common.loading')}
      </main>
    )
  }

  if (teaser.isError) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <Alert tone="danger">{t('join.invalidToken')}</Alert>
      </main>
    )
  }

  const facts = teaser.data

  if (joinedCaseNo) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
        <div className="flex flex-col gap-4 rounded-2xl border border-success/30 bg-success/8 p-6">
          <CircleCheck className="size-8 text-success" aria-hidden="true" />
          <h1 className="text-2xl font-bold tracking-tight">
            {t('join.success.title')}
          </h1>
          <p className="text-sm leading-7 text-foreground/70">
            {t('join.success.body')}
          </p>
          <p className="font-semibold tabular-nums" dir="ltr">
            {joinedCaseNo}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {/* The case is already scoped to them: GET /cases filters on
              case_parties.user_id, which joining just set. */}
          <Link
            to={`/app/cases/${encodeURIComponent(joinedCaseNo)}`}
            className="inline-flex min-h-12 items-center rounded-xl bg-primary px-6 font-semibold text-primary-foreground transition hover:brightness-110"
          >
            {t('join.success.viewCase')}
          </Link>
          <Link
            to="/app/cases"
            className="inline-flex min-h-12 items-center rounded-xl border border-border px-6 font-semibold transition hover:bg-foreground/5"
          >
            {t('join.success.myCases')}
          </Link>
        </div>
      </main>
    )
  }

  const header = (
    <header className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight">{t('join.title')}</h1>
      <p className="text-sm leading-7 text-foreground/70">
        {t('join.subtitle')}
      </p>

      <dl className="grid gap-px overflow-hidden rounded-2xl border border-border sm:grid-cols-3">
        <div className="bg-background p-4">
          <dt className="text-sm text-foreground/55">{t('join.caseNo')}</dt>
          <dd className="mt-1 font-semibold tabular-nums" dir="ltr">
            {facts.case_no}
          </dd>
        </div>
        <div className="bg-background p-4">
          <dt className="text-sm text-foreground/55">{t('join.occurredAt')}</dt>
          <dd className="mt-1 font-medium">
            {formatDateTime(facts.occurred_at, locale)}
          </dd>
        </div>
        <div className="bg-background p-4">
          <dt className="text-sm text-foreground/55">{t('join.region')}</dt>
          <dd className="mt-1 font-medium">{facts.region ?? '—'}</dd>
        </div>
      </dl>

      {/* Shown before sign-in too: it explains why this page is so sparse,
          rather than leaving the recipient wondering what was withheld. */}
      <Alert tone="info">{t('join.whyNoStatement')}</Alert>
    </header>
  )

  // Anonymous: show the facts, then hand off to the existing OTP login with a
  // return path, rather than growing a second sign-in implementation here.
  if (!user) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
        {header}

        <section className="flex flex-col gap-4 rounded-2xl border border-border p-6">
          <h2 className="text-lg font-semibold tracking-tight">
            {t('join.signIn.title')}
          </h2>
          <p className="text-sm leading-7 text-foreground/70">
            {t('join.signIn.body')}
          </p>
          <div>
            <Link
              to="/login"
              state={{ from: `${location.pathname}${location.search}` }}
              className="inline-flex min-h-12 items-center rounded-xl bg-primary px-6 font-semibold text-primary-foreground transition hover:brightness-110"
            >
              {t('join.signIn.action')}
            </Link>
          </div>
        </section>
      </main>
    )
  }

  const allSlotsFilled = PHOTO_SLOTS.every((slot) => photos[slot])
  const filledSlots = PHOTO_SLOTS.filter(
    (slot) => photos[slot] instanceof File,
  )
  const orderedPhotos = [
    ...filledSlots.map((slot) => photos[slot] as File),
    ...extraPhotos,
  ]
  // Built from the same slot list in the same order, so the two arrays the API
  // zips together can never drift apart.
  const orderedKeys = [
    ...filledSlots.map((slot) => photoKeys[slot]),
    ...extraKeys.slice(0, extraPhotos.length),
  ]

  const goToStatement = () => {
    if (!allSlotsFilled) {
      setError(t('join.photosRequired'))
      return
    }
    setError(null)
    setStep('statement')
  }

  const submit = () => {
    const trimmed = statement.trim()

    if (trimmed.length === 0) {
      setError(t('join.statement.required'))
      return
    }
    if (trimmed.length > 2000) {
      setError(t('join.statement.tooLong'))
      return
    }

    setError(null)
    mutation.mutate({
      token,
      statement: trimmed,
      photos: orderedPhotos,
      photoKeys: orderedKeys,
    })
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 p-6">
      {header}

      <p className="text-sm font-medium text-foreground/60">
        {step === 'photos'
          ? t('join.steps.photos')
          : t('join.steps.statement')}
      </p>

      {error ? <Alert tone="danger">{error}</Alert> : null}

      {step === 'photos' ? (
        <>
          {/* The wizard's guided capture, reused whole: same four slots, same
              ghost frames, same client-side compression. */}
          <PhotosStep
            photos={photos}
            extraPhotos={extraPhotos}
            onSlotChange={setSlot}
            onExtraAdd={addExtra}
            onExtraRemove={removeExtra}
          />
          <div>
            <Button size="lg" onClick={goToStatement}>
              {t('join.next')}
            </Button>
          </div>
        </>
      ) : (
        <>
          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold tracking-tight">
              {t('join.statement.title')}
            </h2>
            <Textarea
              label={t('join.statement.label')}
              placeholder={t('join.statement.placeholder')}
              maxLength={2000}
              className="min-h-40"
              value={statement}
              onChange={(event) => setStatement(event.target.value)}
            />
          </section>

          <div className="flex flex-wrap gap-3">
            <Button
              size="lg"
              onClick={submit}
              loading={mutation.isPending}
            >
              {mutation.isPending ? t('join.submitting') : t('join.submit')}
            </Button>
            <Button
              size="lg"
              variant="ghost"
              onClick={() => {
                setStep('photos')
                setError(null)
              }}
            >
              {t('join.previous')}
            </Button>
          </div>
        </>
      )}
    </main>
  )
}
