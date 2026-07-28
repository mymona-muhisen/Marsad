import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router'
import { z } from 'zod'

import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { ApiError } from '@/lib/api/errors'
import { requestOtp, verifyOtp } from './api'
import { useAuth } from './useAuth'

/** Syrian mobile numbers — same rule as the backend's FormRequest. */
const PHONE_PATTERN = /^09\d{8}$/
const CODE_PATTERN = /^\d{6}$/
const RESEND_COOLDOWN_SECONDS = 60

type Step = 'phone' | 'code'

export function LoginPage() {
  const { t } = useTranslation()
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [banner, setBanner] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  /** Where the guard bounced the user from, so sign-in returns them there. */
  const redirectTo =
    (location.state as { from?: string } | null)?.from ?? '/app'

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setTimeout(() => setCooldown((n) => n - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [cooldown])

  const describeError = useCallback(
    (error: unknown): string => {
      if (error instanceof ApiError) {
        if (error.isOffline) return t('errors.network')
        if (error.isRateLimited) {
          return error.retryAfter
            ? t('errors.rateLimited', { seconds: error.retryAfter })
            : t('errors.rateLimitedNoDelay')
        }
        // Laravel's Arabic validation messages are already user-facing.
        if (error.message) return error.message
      }
      return t('errors.unexpected')
    },
    [t],
  )

  // ---- Step 1: phone --------------------------------------------------

  const phoneSchema = useMemo(
    () =>
      z.object({
        phone: z.string().regex(PHONE_PATTERN, t('auth.phoneInvalid')),
        full_name: z
          .string()
          .max(120, t('auth.fullNameTooLong'))
          .optional(),
      }),
    [t],
  )

  const phoneForm = useForm<z.infer<typeof phoneSchema>>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: '', full_name: '' },
  })

  const requestMutation = useMutation({
    mutationFn: requestOtp,
    onSuccess: (_data, variables) => {
      setBanner(null)
      setPhone(variables.phone)
      setCooldown(RESEND_COOLDOWN_SECONDS)
      setStep('code')
    },
    onError: (error) => {
      // The backend decides when full_name is mandatory (first sign-in for
      // this number), so field errors are mapped back onto the form.
      if (error instanceof ApiError && error.isValidation) {
        for (const field of error.invalidFields) {
          if (field === 'phone' || field === 'full_name') {
            phoneForm.setError(field, {
              message: error.fieldError(field),
            })
          }
        }
        if (error.invalidFields.length > 0) return
      }
      setBanner(describeError(error))
    },
  })

  // ---- Step 2: code ---------------------------------------------------

  const codeSchema = useMemo(
    () =>
      z.object({
        code: z.string().regex(CODE_PATTERN, t('auth.codeInvalid')),
      }),
    [t],
  )

  const codeForm = useForm<z.infer<typeof codeSchema>>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: '' },
  })

  const verifyMutation = useMutation({
    mutationFn: verifyOtp,
    onSuccess: (data) => {
      signIn(data.token, data.user)
      void navigate(redirectTo, { replace: true })
    },
    onError: (error) => {
      if (error instanceof ApiError && error.isValidation) {
        codeForm.setError('code', {
          message: error.fieldError('code') ?? error.message,
        })
        return
      }
      setBanner(describeError(error))
    },
  })

  const resend = () => {
    if (cooldown > 0) return
    setBanner(null)
    requestMutation.mutate({ phone })
  }

  const backToPhone = () => {
    setBanner(null)
    codeForm.reset()
    setStep('phone')
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center gap-8 px-5 py-16">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">{t('auth.title')}</h1>
        <p className="mt-3 text-sm leading-7 text-foreground/65">
          {step === 'phone'
            ? t('auth.subtitle')
            : t('auth.codeSentTo', { phone })}
        </p>
      </header>

      {banner ? <Alert tone="danger">{banner}</Alert> : null}

      {step === 'phone' ? (
        <form
          noValidate
          className="flex flex-col gap-5"
          onSubmit={phoneForm.handleSubmit((values) =>
            requestMutation.mutate({
              phone: values.phone,
              full_name: values.full_name?.trim() || undefined,
            }),
          )}
        >
          <TextField
            {...phoneForm.register('phone')}
            label={t('auth.phoneLabel')}
            placeholder={t('auth.phonePlaceholder')}
            hint={t('auth.phoneHint')}
            error={phoneForm.formState.errors.phone?.message}
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            dir="ltr"
            className="text-start"
          />

          <TextField
            {...phoneForm.register('full_name')}
            label={t('auth.fullNameLabel')}
            placeholder={t('auth.fullNamePlaceholder')}
            hint={t('auth.fullNameHint')}
            error={phoneForm.formState.errors.full_name?.message}
            autoComplete="name"
          />

          <Button type="submit" size="lg" block loading={requestMutation.isPending}>
            {requestMutation.isPending ? t('auth.sending') : t('auth.sendCode')}
          </Button>
        </form>
      ) : (
        <form
          noValidate
          className="flex flex-col gap-5"
          onSubmit={codeForm.handleSubmit((values) =>
            verifyMutation.mutate({ phone, code: values.code }),
          )}
        >
          <TextField
            {...codeForm.register('code')}
            label={t('auth.codeLabel')}
            error={codeForm.formState.errors.code?.message}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            dir="ltr"
            className="text-center text-2xl tracking-[0.5em]"
            autoFocus
          />

          <Button type="submit" size="lg" block loading={verifyMutation.isPending}>
            {verifyMutation.isPending ? t('auth.verifying') : t('auth.verify')}
          </Button>

          <div className="flex items-center justify-between gap-3">
            <Button type="button" variant="ghost" size="sm" onClick={backToPhone}>
              {t('auth.changePhone')}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resend}
              disabled={cooldown > 0 || requestMutation.isPending}
            >
              {cooldown > 0
                ? t('auth.resendIn', { seconds: cooldown })
                : t('auth.resend')}
            </Button>
          </div>
        </form>
      )}

      {import.meta.env.DEV ? (
        <Alert tone="info">{t('auth.devHint')}</Alert>
      ) : null}
    </main>
  )
}
