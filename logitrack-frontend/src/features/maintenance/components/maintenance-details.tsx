'use client'

import { useLocale, useTranslations } from 'next-intl'
import { formatCurrency, formatDate, formatDateTime } from '@/shared/lib/format'
import { Alert } from '@/shared/ui/alert'
import { builtInMaintenanceServiceKey } from '../lib/maintenance-service-name'
import type { MaintenanceOrder } from '../model/maintenance'
import { ServiceStatusBadge } from './service-status-badge'

export function MaintenanceDetails({ order }: { order: MaintenanceOrder }) {
  const t = useTranslations('Maintenance.details')
  const serviceNames = useTranslations('Maintenance.serviceNames')
  const locale = useLocale()
  const overdueDate = order.status === 'pending' ? order.plannedStart : order.plannedFinish

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xs border border-outline-variant bg-surface-container-low p-4">
        <div>
          <p className="font-data-mono text-title-md font-bold text-on-surface">{order.vehiclePlate}</p>
          <p className="text-body-sm text-on-surface-variant">{order.vehicleModel} · {t('order', { id: order.id })}</p>
        </div>
        <ServiceStatusBadge status={order.status} />
      </div>

      {order.overdue && (
        <Alert tone="warning" title={order.status === 'pending' ? t('overdueStartTitle') : t('overdueFinishTitle')}>
          {order.status === 'pending'
            ? t('overdueStartBody', { date: formatDate(overdueDate, locale) })
            : t('overdueFinishBody', { date: formatDate(overdueDate, locale) })}
        </Alert>
      )}

      <dl className="grid grid-cols-1 gap-4 text-body-sm sm:grid-cols-2">
        <div><dt className="text-on-surface-variant">{t('plannedWindow')}</dt><dd>{formatDate(order.plannedStart, locale)} — {formatDate(order.plannedFinish, locale)}</dd></div>
        <div><dt className="text-on-surface-variant">{t('totalCost')}</dt><dd className="font-data-mono font-bold">{formatCurrency(order.totalCost, locale)}</dd></div>
        <div><dt className="text-on-surface-variant">{t('actuallyStarted')}</dt><dd>{order.startedAt ? formatDateTime(order.startedAt, locale) : '—'}</dd></div>
        <div><dt className="text-on-surface-variant">{t('actuallyCompleted')}</dt><dd>{order.completedAt ? formatDateTime(order.completedAt, locale) : '—'}</dd></div>
      </dl>

      <div>
        <h3 className="mb-2 font-label-caps text-label-caps uppercase text-on-surface-variant">{t('services')}</h3>
        <div className="divide-y divide-outline-variant overflow-hidden rounded-xs border border-outline-variant">
          {order.services.map((service) => {
            const serviceKey = builtInMaintenanceServiceKey(service.name)
            return (
              <div key={service.id} className="flex items-center justify-between gap-4 px-4 py-3 text-body-sm">
                <span>{serviceKey ? serviceNames(serviceKey) : service.name}</span>
                <span className="font-data-mono">{formatCurrency(service.cost, locale)}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
