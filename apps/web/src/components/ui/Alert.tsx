import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

const tones = {
  info: { className: 'border-primary/25 bg-primary/8 text-foreground', Icon: Info },
  success: {
    className: 'border-success/30 bg-success/10 text-foreground',
    Icon: CircleCheck,
  },
  warning: {
    className: 'border-warning/30 bg-warning/10 text-foreground',
    Icon: TriangleAlert,
  },
  danger: {
    className: 'border-danger/30 bg-danger/10 text-foreground',
    Icon: CircleAlert,
  },
} as const

type Props = {
  tone?: keyof typeof tones
  title?: string
  children?: ReactNode
  className?: string
}

export function Alert({ tone = 'info', title, children, className }: Props) {
  const { className: toneClass, Icon } = tones[tone]

  return (
    <div
      // Errors must interrupt; the rest can wait for the reader's cursor.
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-3 rounded-xl border p-4 text-sm leading-7',
        toneClass,
        className,
      )}
    >
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div>
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={title ? 'mt-1' : undefined}>{children}</div> : null}
      </div>
    </div>
  )
}
