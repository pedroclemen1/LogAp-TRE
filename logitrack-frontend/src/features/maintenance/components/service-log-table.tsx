'use client'

import { useLocale, useTranslations } from 'next-intl'
import { IconButton } from '@/shared/ui/icon-button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { formatCurrency, formatDate, formatDateRange, formatDateTime } from '@/shared/lib/format'
import { builtInMaintenanceServiceKey } from '../lib/maintenance-service-name'
import type { MaintenanceOrder } from '../model/maintenance'
import { ServiceStatusBadge } from './service-status-badge'
import { SERVICE_ROW_TONE } from './service-status-tone'

const TH = 'px-3 py-3 uppercase tracking-wider'

function serviceSummary(order: MaintenanceOrder, displayName: (name: string) => string): string {
  const [first, ...rest] = order.services
  if (!first) return '—'
  return rest.length > 0 ? `${displayName(first.name)} +${rest.length}` : displayName(first.name)
}

export function ServiceLogTable({ orders, onEdit, onView, onStart, onFinish, onDelete }: {
  orders: readonly MaintenanceOrder[]
  onEdit: (order: MaintenanceOrder) => void
  onView: (order: MaintenanceOrder) => void
  onStart: (order: MaintenanceOrder) => void
  onFinish: (order: MaintenanceOrder) => void
  onDelete: (order: MaintenanceOrder) => void
}) {
  const t = useTranslations('Maintenance.table')
  const serviceNames = useTranslations('Maintenance.serviceNames')
  const locale = useLocale()
  const displayServiceName = (name: string) => {
    const key = builtInMaintenanceServiceKey(name)
    return key ? serviceNames(key) : name
  }
  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[840px]">
        <TableHeader className="sticky top-0 z-10 border-b border-outline-variant bg-table-header">
          <TableRow>
            <TableHead className={TH}>{t('vehicle')}</TableHead>
            <TableHead className={TH}>{t('services')}</TableHead>
            <TableHead className={TH}>{t('timeline')}</TableHead>
            <TableHead className={`${TH} text-right`}>{t('cost')}</TableHead>
            <TableHead className={TH}>{t('status')}</TableHead>
            <TableHead className={`${TH} w-36 text-right`}>{t('actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-outline-variant/50 bg-surface text-body-sm">
          {orders.length === 0 && (
            <TableRow><TableCell colSpan={6} className="p-8 text-center text-on-surface-variant">{t('empty')}</TableCell></TableRow>
          )}
          {orders.map((order) => (
            <TableRow key={order.id} className={`h-compact-row-height hover:bg-surface-container-low ${SERVICE_ROW_TONE[order.status]} ${order.overdue ? 'bg-error-container/10' : ''}`}>
              <TableCell className="px-3 py-2">
                <div className="font-data-mono font-bold text-on-surface">{order.vehiclePlate}</div>
                <div className="text-[10px] text-on-surface-variant">{order.vehicleModel}</div>
              </TableCell>
              <TableCell className="max-w-[230px] px-3 py-2" title={order.services.map((service) => displayServiceName(service.name)).join(', ')}>
                <span className="block truncate text-on-surface">{serviceSummary(order, displayServiceName)}</span>
                <span className="text-[10px] text-on-surface-variant">{t('serviceCount', { count: order.services.length })}</span>
              </TableCell>
              <TableCell className="px-3 py-2 font-data-mono text-[11px] text-on-surface-variant">
                <div>{formatDateRange(order.plannedStart, order.plannedFinish, locale)}</div>
                {order.startedAt && <div>{t('started', { date: formatDateTime(order.startedAt, locale) })}</div>}
                {order.completedAt && <div>{t('finished', { date: formatDateTime(order.completedAt, locale) })}</div>}
                {order.overdue && (
                  <div className="font-bold text-error">
                    {order.status === 'pending'
                      ? t('overdueStart', { date: formatDate(order.plannedStart, locale) })
                      : t('overdueFinish', { date: formatDate(order.plannedFinish, locale) })}
                  </div>
                )}
              </TableCell>
              <TableCell className="px-3 py-2 text-right font-data-mono text-on-surface">{formatCurrency(order.totalCost, locale)}</TableCell>
              <TableCell className="px-3 py-2"><ServiceStatusBadge status={order.status} /></TableCell>
              <TableCell className="px-3 py-2">
                <div className="flex justify-end gap-1">
                  <IconButton aria-label={t('viewAria', { id: order.id })} title={t('view')} icon="visibility" className="h-7 w-7" onClick={() => onView(order)} />
                  {order.status !== 'completed' && (
                    <IconButton aria-label={t('editAria', { id: order.id })} title={t('edit')} icon="edit" className="h-7 w-7 text-primary" onClick={() => onEdit(order)} />
                  )}
                  {order.status === 'pending' && (
                    <IconButton aria-label={t('startAria', { id: order.id })} title={t('start')} icon="play_arrow" className="h-7 w-7 text-primary" onClick={() => onStart(order)} />
                  )}
                  {order.status === 'in_progress' && (
                    <IconButton aria-label={t('finishAria', { id: order.id })} title={t('finish')} icon="check_circle" className="h-7 w-7 text-[#137333]" onClick={() => onFinish(order)} />
                  )}
                  {order.status === 'pending' && (
                    <IconButton aria-label={t('deleteAria', { id: order.id })} title={t('delete')} icon="delete" className="h-7 w-7 text-error" onClick={() => onDelete(order)} />
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
