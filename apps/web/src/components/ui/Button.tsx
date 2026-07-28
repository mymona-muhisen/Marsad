import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'

import { cn } from '@/lib/utils'
import { Spinner } from './Spinner'

const button = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:brightness-110',
        secondary:
          'border border-border bg-background text-foreground hover:bg-foreground/5',
        ghost: 'text-foreground/70 hover:bg-foreground/5 hover:text-foreground',
        danger: 'bg-danger text-white hover:brightness-110',
      },
      size: {
        // Large touch targets by default: the primary user is stressed and
        // one-handed on a phone (design brief, constraints).
        md: 'min-h-12 px-5 text-sm',
        lg: 'min-h-14 px-6 text-base',
        sm: 'min-h-9 px-3 text-sm',
      },
      block: {
        true: 'w-full',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

type Props = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof button> & {
    loading?: boolean
  }

export function Button({
  className,
  variant,
  size,
  block,
  loading = false,
  disabled,
  children,
  ...props
}: Props) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(button({ variant, size, block }), className)}
    >
      {loading ? <Spinner className="size-4" /> : null}
      {children}
    </button>
  )
}
