import { useLocale, useTranslations } from 'next-intl'
import { Icon } from '@/shared/ui/icon'
import { diffInDays, todayLocalDate } from '@/shared/lib/date-string'
import { formatDate } from '@/shared/lib/format'
import { builtInMaintenanceServiceKey } from '../lib/maintenance-service-name'
import type { MaintenanceOrder } from '../model/maintenance'

export function UpcomingSchedule({ items, onSelect }: {
  items: readonly MaintenanceOrder[]
  onSelect: (order: MaintenanceOrder) => void
}) {
  const t = useTranslations('Maintenance.schedule')
  const serviceNames = useTranslations('Maintenance.serviceNames')
  const locale = useLocale()
  const today = todayLocalDate()
  if (items.length === 0) {
    return <p className="p-6 text-center text-body-sm text-on-surface-variant">{t('empty')}</p>
  }

  return (
    <div className="relative flex-1 overflow-auto p-4">
      <div className="absolute bottom-6 left-6 top-6 w-0.5 bg-outline-variant/50" />
      <div className="relative z-10 flex flex-col gap-5">
        {items.map((item) => {
          const relevantDate = item.status === 'pending' ? item.plannedStart : item.plannedFinish
          const difference = diffInDays(today, relevantDate)
          const label = item.overdue
            ? item.status === 'pending'
              ? t('overdueStart', { date: formatDate(relevantDate, locale) })
              : t('overdueFinish', { date: formatDate(relevantDate, locale) })
            : difference === 0
              ? t('today')
              : difference === 1
                ? t('tomorrow')
                : formatDate(relevantDate, locale)
          return (
          <button key={item.id} type="button" onClick={() => onSelect(item)} className="flex w-full gap-4 text-left">
            <span className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-surface ${
              item.overdue ? 'bg-error' : item.status === 'in_progress' ? 'bg-primary' : 'bg-surface border-outline'
            }`}>
              {item.overdue && <Icon name="priority_high" className="text-[12px] text-on-error" />}
            </span>
            <span className={`flex-1 rounded-xs border p-3 transition-colors hover:bg-surface-container-low ${
              item.overdue ? 'border-error-container bg-error-container/20' : 'border-outline-variant bg-surface'
            }`}>
              <span className="mb-1 flex justify-between gap-3">
                <span className={`font-label-caps text-label-caps ${item.overdue ? 'text-error' : 'text-primary'}`}>
                  {label}
                </span>
                <span className="font-data-mono text-[11px] text-on-surface-variant">{item.vehiclePlate}</span>
              </span>
              <span className="block text-body-sm text-on-surface">
                {item.services.map((service) => {
                  const key = builtInMaintenanceServiceKey(service.name)
                  return key ? serviceNames(key) : service.name
                }).join(', ')}
              </span>
            </span>
          </button>
          )
        })}
      </div>
    </div>
  )
}
