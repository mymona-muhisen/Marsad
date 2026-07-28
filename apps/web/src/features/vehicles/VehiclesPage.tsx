import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CarFront, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { TextField } from '@/components/ui/TextField'
import { ApiError } from '@/lib/api/errors'
import { createVehicle, fetchVehicles, vehiclesQueryKey } from './api'

export function VehiclesPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [banner, setBanner] = useState<string | null>(null)

  const vehicles = useQuery({
    queryKey: vehiclesQueryKey,
    queryFn: fetchVehicles,
  })

  const schema = useMemo(
    () =>
      z.object({
        plate_no: z.string().min(1, t('vehicles.plateRequired')).max(20),
        make: z.string().min(1, t('vehicles.makeRequired')).max(50),
        model: z.string().min(1, t('vehicles.modelRequired')).max(50),
        year: z.string().optional(),
        color: z.string().max(30).optional(),
      }),
    [t],
  )

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { plate_no: '', make: '', model: '', year: '', color: '' },
  })

  const mutation = useMutation({
    mutationFn: createVehicle,
    onSuccess: async () => {
      setBanner(null)
      form.reset()
      setAdding(false)
      await queryClient.invalidateQueries({ queryKey: vehiclesQueryKey })
    },
    onError: (error) => {
      if (error instanceof ApiError && error.isValidation) {
        for (const field of error.invalidFields) {
          if (field in form.getValues()) {
            form.setError(field as keyof z.infer<typeof schema>, {
              message: error.fieldError(field),
            })
          }
        }
        if (error.invalidFields.length > 0) return
      }
      setBanner(
        error instanceof ApiError && error.isOffline
          ? t('errors.network')
          : t('errors.unexpected'),
      )
    },
  })

  const submit = form.handleSubmit((values) => {
    const year = values.year?.trim()
    if (year && (Number(year) < 1950 || Number(year) > 2030)) {
      form.setError('year', { message: t('vehicles.yearRange') })
      return
    }

    mutation.mutate({
      plate_no: values.plate_no.trim(),
      make: values.make.trim(),
      model: values.model.trim(),
      year: year ? Number(year) : undefined,
      color: values.color?.trim() || undefined,
    })
  })

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">
          {t('vehicles.title')}
        </h1>
        <p className="mt-3 max-w-prose text-sm leading-7 text-foreground/65">
          {t('vehicles.subtitle')}
        </p>
      </header>

      {banner ? <Alert tone="danger">{banner}</Alert> : null}

      {vehicles.isPending ? (
        <p className="flex items-center gap-3 text-sm text-foreground/60">
          <Spinner className="size-4 text-primary" />
          {t('common.loading')}
        </p>
      ) : null}

      {vehicles.isError ? (
        <Alert tone="danger">
          {t('errors.network')}{' '}
          <button
            type="button"
            className="underline"
            onClick={() => void vehicles.refetch()}
          >
            {t('common.retry')}
          </button>
        </Alert>
      ) : null}

      {vehicles.data ? (
        vehicles.data.data.length === 0 ? (
          <p className="text-sm text-foreground/60">{t('vehicles.empty')}</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {vehicles.data.data.map((vehicle) => (
              <li
                key={vehicle.id}
                className="flex items-center gap-4 rounded-2xl border border-border p-5"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <CarFront className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-semibold" dir="ltr">
                    {vehicle.plate_no}
                  </p>
                  <p className="text-sm text-foreground/60">
                    {vehicle.make} {vehicle.model}
                    {vehicle.year ? ` · ${vehicle.year}` : ''}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : null}

      {adding ? (
        <form
          noValidate
          onSubmit={submit}
          className="flex flex-col gap-5 rounded-2xl border border-border p-6"
        >
          <h2 className="text-lg font-semibold">{t('vehicles.addTitle')}</h2>

          <TextField
            {...form.register('plate_no')}
            label={t('vehicles.plateNo')}
            error={form.formState.errors.plate_no?.message}
            dir="ltr"
            className="text-start"
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              {...form.register('make')}
              label={t('vehicles.make')}
              placeholder={t('vehicles.makePlaceholder')}
              error={form.formState.errors.make?.message}
            />
            <TextField
              {...form.register('model')}
              label={t('vehicles.model')}
              error={form.formState.errors.model?.message}
            />
            <TextField
              {...form.register('year')}
              label={`${t('vehicles.year')} (${t('vehicles.optional')})`}
              error={form.formState.errors.year?.message}
              inputMode="numeric"
              dir="ltr"
              className="text-start"
            />
            <TextField
              {...form.register('color')}
              label={`${t('vehicles.color')} (${t('vehicles.optional')})`}
              error={form.formState.errors.color?.message}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" loading={mutation.isPending}>
              {mutation.isPending ? t('vehicles.saving') : t('vehicles.save')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setAdding(false)
                setBanner(null)
                form.reset()
              }}
            >
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      ) : (
        <div>
          <Button onClick={() => setAdding(true)}>
            <Plus className="size-4" aria-hidden="true" />
            {t('vehicles.add')}
          </Button>
        </div>
      )}
    </div>
  )
}
