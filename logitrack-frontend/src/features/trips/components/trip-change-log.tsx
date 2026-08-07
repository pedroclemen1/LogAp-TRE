import { formatDateTime } from '@/shared/lib/format'
import { Icon } from '@/shared/ui/icon'
import type { ChangeLogEntry, ChangeLogKind } from '../model/trip'

const VISUAL: Record<ChangeLogKind, { icon: string; node: string; nodeIcon: string }> = {
  stage_completed: {
    icon: 'where_to_vote',
    node: 'bg-tertiary-container border-tertiary-container',
    nodeIcon: 'text-on-tertiary-container',
  },
  route_updated: {
    icon: 'route',
    node: 'bg-surface-container-high border-outline-variant',
    nodeIcon: 'text-on-surface-variant',
  },
  trip_started: {
    icon: 'play_arrow',
    node: 'bg-primary-container border-primary-container',
    nodeIcon: 'text-on-primary-container',
  },
  trip_created: {
    icon: 'note_add',
    node: 'bg-surface-container border-outline-variant',
    nodeIcon: 'text-on-surface-variant',
  },
  trip_completed: {
    icon: 'check_circle',
    node: 'border-[#a7f3d0] bg-[#ecfdf5]',
    nodeIcon: 'text-[#065f46]',
  },
  trip_canceled: {
    icon: 'cancel',
    node: 'border-error-container bg-error-container',
    nodeIcon: 'text-on-error-container',
  },
}

export function TripChangeLog({ entries }: { entries: readonly ChangeLogEntry[] }) {
  const t = useTranslations('Trips.changeLog')
  const locale = useLocale()
  if (entries.length === 0) {
    return <p className="p-6 text-center font-body-sm text-body-sm text-on-surface-variant">{t('empty')}</p>
  }

  return (
    <div className="flex-1 space-y-4 overflow-y-auto p-4">
      {entries.map((entry) => {
        const visual = VISUAL[entry.kind]
        return (
          <div
            key={entry.id}
            className="relative flex gap-3 before:absolute before:bottom-[-16px] before:left-[11px] before:top-6 before:w-[2px] before:bg-outline-variant/30 last:before:hidden"
          >
            <div className={`z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${visual.node}`}>
              <Icon name={visual.icon} className={`text-[12px] ${visual.nodeIcon}`} />
            </div>
            <div className="min-w-0">
              <p className="font-body-sm text-body-sm font-medium leading-tight text-on-surface">{t(`events.${entry.kind}.title`)}</p>
              <p className="mt-0.5 font-body-sm text-[11px] text-on-surface-variant">{t(`events.${entry.kind}.detail`)}</p>
              <p className="mt-1 font-data-mono text-[10px] text-on-surface-variant opacity-70">
                {formatDateTime(entry.occurredAt, locale)} • {entry.author === 'Sistema' ? t('system') : entry.author}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
import { useLocale, useTranslations } from 'next-intl'
