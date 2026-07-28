import { useId, type Ref, type TextareaHTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> & {
  label: string
  hint?: string
  error?: string
  ref?: Ref<HTMLTextAreaElement>
}

export function Textarea({ label, hint, error, className, ref, ...props }: Props) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`

  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') ||
    undefined

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>

      <textarea
        {...props}
        id={id}
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          'min-h-40 rounded-xl border bg-background p-4 text-base leading-8 text-foreground transition',
          'placeholder:text-foreground/35',
          'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary',
          error ? 'border-danger' : 'border-border',
          className,
        )}
      />

      <div className="flex items-start justify-between gap-3">
        {error ? (
          <p id={errorId} role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : hint ? (
          <p id={hintId} className="text-sm text-foreground/55">
            {hint}
          </p>
        ) : (
          <span />
        )}
      </div>
    </div>
  )
}
