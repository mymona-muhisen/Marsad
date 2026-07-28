import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'

import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { ApiError } from '@/lib/api/errors'
import type { AccidentCase } from '@/lib/api/types'
import { createCase } from './api'
import {
  EMPTY_DRAFT,
  clearDraft,
  hasDraft,
  loadDraft,
  saveDraft,
  type ReportDraft,
} from './draft'
import { clearPhotos, loadPhotos, savePhotos } from './photo-store'
import {
  PHOTO_SLOTS,
  WIZARD_STEPS,
  collectPhotos,
  validateStep,
  type PhotoSlot,
  type WizardStep,
} from './steps'
import { CounterpartyStep } from './steps/CounterpartyStep'
import { LocationStep } from './steps/LocationStep'
import { PhotosStep } from './steps/PhotosStep'
import { ReviewStep } from './steps/ReviewStep'
import { StatementStep } from './steps/StatementStep'
import { VehicleStep } from './steps/VehicleStep'

/**
 * UC-01 accident reporting wizard — the platform's hero flow.
 *
 * Designed for someone standing at a crash site: one decision per screen, large
 * targets, and every keystroke and photo written to device storage as it is
 * entered. Closing the tab, running out of battery, or losing signal mid-report
 * costs nothing — reopening resumes exactly where they stopped.
 */
export function ReportWizard() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [draft, setDraft] = useState<ReportDraft>(() => loadDraft())
  const [photos, setPhotos] = useState<Partial<Record<PhotoSlot, File>>>({})
  const [extraPhotos, setExtraPhotos] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const [resumed] = useState(() => hasDraft())

  const topRef = useRef<HTMLDivElement>(null)

  const step = WIZARD_STEPS[Math.min(draft.step, WIZARD_STEPS.length - 1)]
  const stepIndex = WIZARD_STEPS.indexOf(step)
  const state = { draft, photos, extraPhotos }

  // Photos live in IndexedDB (too large for localStorage) and load async.
  useEffect(() => {
    let cancelled = false

    void loadPhotos().then((stored) => {
      if (cancelled || stored.length === 0) return

      const restored: Partial<Record<PhotoSlot, File>> = {}
      PHOTO_SLOTS.forEach((slot, index) => {
        const file = stored[index]
        if (file) restored[slot] = file
      })
      setPhotos(restored)
      setExtraPhotos(stored.slice(PHOTO_SLOTS.length))
    })

    return () => {
      cancelled = true
    }
  }, [])

  const patchDraft = useCallback((patch: Partial<ReportDraft>) => {
    setDraft((current) => {
      const next = { ...current, ...patch }
      saveDraft(next)
      return next
    })
    setError(null)
  }, [])

  /**
   * Slots are persisted positionally, so a missing slot has to occupy its index
   * rather than collapse — otherwise a reload would shuffle photos between
   * slots (a damage close-up reappearing as the wide shot).
   */
  const persistPhotos = useCallback(
    (slots: Partial<Record<PhotoSlot, File>>, extras: File[]) => {
      const ordered = PHOTO_SLOTS.map((slot) => slots[slot]).filter(
        (file): file is File => file instanceof File,
      )
      const complete = PHOTO_SLOTS.every((slot) => slots[slot])
      void savePhotos(complete ? [...ordered, ...extras] : ordered)
    },
    [],
  )

  const setSlot = useCallback(
    (slot: PhotoSlot, file: File) => {
      setPhotos((current) => {
        const next = { ...current, [slot]: file }
        persistPhotos(next, extraPhotos)
        return next
      })
      setError(null)
    },
    [extraPhotos, persistPhotos],
  )

  const addExtra = useCallback(
    (file: File) => {
      setExtraPhotos((current) => {
        const next = [...current, file]
        persistPhotos(photos, next)
        return next
      })
    },
    [photos, persistPhotos],
  )

  const removeExtra = useCallback(
    (index: number) => {
      setExtraPhotos((current) => {
        const next = current.filter((_, i) => i !== index)
        persistPhotos(photos, next)
        return next
      })
    },
    [photos, persistPhotos],
  )

  const goToStep = useCallback(
    (index: number) => {
      patchDraft({ step: index })
      topRef.current?.scrollIntoView({ block: 'start' })
    },
    [patchDraft],
  )

  const submission = useMutation({
    mutationFn: createCase,
    onSuccess: (response) => {
      clearDraft()
      void clearPhotos()
      void navigate('/report/submitted', {
        replace: true,
        state: { case: response.data satisfies AccidentCase },
      })
    },
    onError: (cause) => {
      if (cause instanceof ApiError && cause.isOffline) {
        setError(t('errors.network'))
        return
      }
      // A 422 here means the client gate and the FormRequest disagree; show the
      // server's own message rather than a generic one.
      if (cause instanceof ApiError && cause.message) {
        setError(cause.message)
        return
      }
      setError(t('report.errors.submitFailed'))
    },
  })

  const next = () => {
    const problem = validateStep(step, state)
    if (problem) {
      setError(t(problem))
      return
    }
    setError(null)
    goToStep(stepIndex + 1)
  }

  const submit = () => {
    // Re-check every step, not just this one: the user can jump back via the
    // review screen's edit links and leave an earlier step incomplete.
    for (const earlier of WIZARD_STEPS) {
      const problem = validateStep(earlier, state)
      if (problem) {
        setError(t(problem))
        goToStep(WIZARD_STEPS.indexOf(earlier))
        return
      }
    }

    submission.mutate({
      vehicleId: draft.vehicleId as number,
      occurredAt: new Date(draft.occurredAt).toISOString(),
      lat: draft.lat as number,
      lng: draft.lng as number,
      locationVerified: draft.locationVerified,
      injuryFlag: draft.injuryFlag === true,
      statement: draft.statement.trim(),
      photos: collectPhotos(state),
      hitAndRun: draft.hitAndRun,
      counterpartyPhone: draft.hitAndRun ? undefined : draft.counterpartyPhone,
      counterpartyPlate: draft.hitAndRun
        ? undefined
        : draft.counterpartyPlate || undefined,
    })
  }

  const startOver = () => {
    clearDraft()
    void clearPhotos()
    setDraft({ ...EMPTY_DRAFT })
    setPhotos({})
    setExtraPhotos([])
    setError(null)
  }

  return (
    <div ref={topRef} className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <header className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <Link to="/app" className="text-sm text-primary hover:underline">
            {t('common.back')}
          </Link>
          <span className="text-sm text-foreground/55">
            {t('report.stepOf', {
              current: stepIndex + 1,
              total: WIZARD_STEPS.length,
            })}
          </span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight">
          {t('report.title')}
        </h1>

        <div
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={WIZARD_STEPS.length}
          aria-valuenow={stepIndex + 1}
          aria-label={t('report.title')}
          className="h-1.5 overflow-hidden rounded-full bg-foreground/10"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500"
            style={{
              width: `${((stepIndex + 1) / WIZARD_STEPS.length) * 100}%`,
            }}
          />
        </div>

        <ol className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-foreground/45">
          {WIZARD_STEPS.map((name, index) => (
            <li
              key={name}
              aria-current={index === stepIndex ? 'step' : undefined}
              className={index === stepIndex ? 'font-semibold text-primary' : ''}
            >
              {t(`report.steps.${name}`)}
            </li>
          ))}
        </ol>
      </header>

      {resumed && stepIndex === 0 ? (
        <Alert tone="info">
          <p>{t('report.draftRestored')}</p>
          <button
            type="button"
            onClick={startOver}
            className="mt-2 text-sm text-primary underline"
          >
            {t('report.discardDraft')}
          </button>
        </Alert>
      ) : null}

      {error ? <Alert tone="danger">{error}</Alert> : null}

      {step === 'vehicle' ? (
        <VehicleStep draft={draft} onChange={patchDraft} />
      ) : null}
      {step === 'location' ? (
        <LocationStep draft={draft} onChange={patchDraft} />
      ) : null}
      {step === 'photos' ? (
        <PhotosStep
          photos={photos}
          extraPhotos={extraPhotos}
          onSlotChange={setSlot}
          onExtraAdd={addExtra}
          onExtraRemove={removeExtra}
        />
      ) : null}
      {step === 'counterparty' ? (
        <CounterpartyStep draft={draft} onChange={patchDraft} />
      ) : null}
      {step === 'statement' ? (
        <StatementStep draft={draft} onChange={patchDraft} />
      ) : null}
      {step === 'review' ? (
        <ReviewStep
          draft={draft}
          photoCount={collectPhotos(state).length}
          onEdit={(target: WizardStep) =>
            goToStep(WIZARD_STEPS.indexOf(target))
          }
        />
      ) : null}

      <footer className="sticky bottom-0 -mx-5 flex gap-3 border-t border-border bg-background/90 px-5 py-4 backdrop-blur-xl">
        {stepIndex > 0 ? (
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={() => goToStep(stepIndex - 1)}
            disabled={submission.isPending}
          >
            <ArrowRight className="size-4 ltr:rotate-180" aria-hidden="true" />
            {t('report.previous')}
          </Button>
        ) : null}

        {step === 'review' ? (
          <Button
            type="button"
            size="lg"
            block
            onClick={submit}
            loading={submission.isPending}
          >
            {submission.isPending
              ? t('report.review.submitting')
              : t('report.review.submit')}
          </Button>
        ) : (
          <Button type="button" size="lg" block onClick={next}>
            {t('report.next')}
            <ArrowLeft className="size-4 ltr:rotate-180" aria-hidden="true" />
          </Button>
        )}
      </footer>
    </div>
  )
}
