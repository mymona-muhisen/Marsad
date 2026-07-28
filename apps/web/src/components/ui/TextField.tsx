import { useId, type InputHTMLAttributes, type Ref } from 'react'

import { cn } from '@/lib/utils'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  label: string
  hint?: string
  error?: string
  ref?: Ref<HTMLInputElement>
}

/**
 * Arabic form field: label above and right-aligned by the RTL root, validation
 * message below it (design brief, "Arabic form fields").
 *
 * The input is wired to its hint/error through `aria-describedby` so screen
 * readers announce the failure with the field rather than in isolation.
 */
export function TextField({
  label,
  hint,
  error,
  className,
  ref,
  ...props
}: Props) {
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

      <input
        {...props}
        id={id}
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          'min-h-12 rounded-xl border bg-background px-4 text-base text-foreground transition',
          'placeholder:text-foreground/35',
          'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary',
          error ? 'border-danger' : 'border-border',
          className,
        )}
      />

      {error ? (
        <p id={errorId} role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-sm text-foreground/55">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
