import { useQuery } from '@tanstack/react-query'
import { FileAudio, FileText, Fingerprint, PenLine } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Spinner } from '@/components/ui/Spinner'
import type { EvidenceItem } from '@/lib/api/types'
import { fetchEvidenceUrl } from './api'

const TYPE_ICONS = {
  photo: null,
  voice: FileAudio,
  sketch: PenLine,
  document: FileText,
} as const

/**
 * One evidence item. The signed URL is fetched per item and cached by the query
 * client — links expire after 30 minutes, so they are deliberately not stored
 * anywhere longer-lived than this session's cache.
 */
function EvidenceCard({ item }: { item: EvidenceItem }) {
  const { t } = useTranslation()
  const isPhoto = item.type === 'photo'

  const media = useQuery({
    queryKey: ['evidence', item.id, 'url'],
    queryFn: () => fetchEvidenceUrl(item.id),
    enabled: isPhoto,
    // Comfortably inside the link's 30-minute lifetime.
    staleTime: 20 * 60 * 1000,
    retry: false,
  })

  const Icon = TYPE_ICONS[item.type]

  return (
    <li className="overflow-hidden rounded-2xl border border-border">
      <div className="relative aspect-4/3 bg-foreground/4">
        {isPhoto && media.isPending ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Spinner className="size-5 text-primary" />
          </div>
        ) : null}

        {isPhoto && media.data ? (
          <img
            src={media.data}
            alt=""
            loading="lazy"
            className="absolute inset-0 size-full object-cover"
          />
        ) : null}

        {isPhoto && media.isError ? (
          <p className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-foreground/55">
            {t('cases.evidence.loadFailed')}
          </p>
        ) : null}

        {!isPhoto && Icon ? (
          <Icon
            className="absolute left-1/2 top-1/2 size-9 -translate-x-1/2 -translate-y-1/2 text-primary/45"
            aria-hidden="true"
          />
        ) : null}
      </div>

      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium">
            {t(`cases.evidence.types.${item.type}`)}
          </span>
          {item.superseded_by ? (
            <span className="text-xs text-warning">
              {t('cases.evidence.superseded')}
            </span>
          ) : null}
        </div>

        {/* The hash is the whole point of the evidence vault — showing it is
            what makes "tamper-evident" visible rather than just claimed. */}
        <p
          className="flex items-center gap-1.5 font-mono text-[11px] text-foreground/45"
          title={item.sha256}
        >
          <Fingerprint className="size-3.5 shrink-0" aria-hidden="true" />
          <span dir="ltr" className="truncate">
            {item.sha256.slice(0, 16)}…
          </span>
        </p>
      </div>
    </li>
  )
}

export function EvidenceGallery({ items }: { items: EvidenceItem[] }) {
  const { t } = useTranslation()

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline gap-3">
        <h2 className="text-lg font-semibold tracking-tight">
          {t('cases.evidence.title')}
        </h2>
        <span className="text-sm text-foreground/50">
          {t('cases.evidence.count', { count: items.length })}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-foreground/60">{t('cases.evidence.empty')}</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <EvidenceCard key={item.id} item={item} />
          ))}
        </ul>
      )}
    </section>
  )
}
