import type { ReactNode } from 'react'

import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'

type Props = {
  title?: string
  body?: string
  action?: ReactNode
}

export function FullPageLoading({ label }: { label: string }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4">
      <Spinner className="size-8 text-primary" />
      <p className="text-sm text-foreground/60">{label}</p>
    </div>
  )
}

export function FullPageMessage({ title, body, action }: Props) {
  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-4 px-5 text-center">
      {title ? <h1 className="text-2xl font-bold tracking-tight">{title}</h1> : null}
      {body ? <p className="text-sm leading-7 text-foreground/65">{body}</p> : null}
      {action}
    </main>
  )
}

export function FullPageError({
  title,
  body,
  retryLabel,
  onRetry,
}: Props & { retryLabel: string; onRetry: () => void }) {
  return (
    <FullPageMessage
      title={title}
      body={body}
      action={
        <Button variant="secondary" onClick={onRetry}>
          {retryLabel}
        </Button>
      }
    />
  )
}
