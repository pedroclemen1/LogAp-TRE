'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { useState, useTransition } from 'react'
import type { Paged } from '@/shared/api/page'
import { paginationWindow } from '@/shared/lib/pagination'
import { Button } from '@/shared/ui/button'
import { Icon } from '@/shared/ui/icon'
import { MetricCard } from '@/shared/ui/metric-card'
import { Modal } from '@/shared/ui/modal'
import { PaginationArrow } from '@/shared/ui/pagination'
import { ProgressBar } from '@/shared/ui/progress-bar'
import { TableFooter } from '@/shared/ui/table'
import { useToast } from '@/shared/ui/use-toast'
import { formatCurrency, formatDate, formatInteger } from '@/shared/lib/format'
import { todayLocalDate } from '@/shared/lib/date-string'
import {
  deleteMaintenanceAction,
  finishMaintenanceAction,
  loadMaintenanceAction,
  startMaintenanceAction,
} from '../actions'
import { maintenanceFiltersToQuery, type MaintenanceFilters } from '../model/maintenance-filters'
import type {
  MaintenanceCatalogService,
  MaintenanceOrder,
  MaintenanceSummary,
  MaintenanceVehicleOption,
} from '../model/maintenance'
import { MaintenanceDetails } from './maintenance-details'
import { MaintenanceForm } from './maintenance-form'
import { MaintenanceToolbar } from './maintenance-toolbar'
import { ServiceLogTable } from './service-log-table'
import { UpcomingSchedule } from './upcoming-schedule'

const PANEL = 'flex flex-col overflow-hidden rounded-xs border border-outline-variant bg-surface shadow-sm'
const PAGE_BUTTON = 'flex h-6 w-6 items-center justify-center rounded-xs font-data-mono text-[12px] transition-colors'

type Confirmation = { kind: 'start' | 'finish' | 'delete'; order: MaintenanceOrder }

function hrefForPage(filters: MaintenanceFilters, page: number): string {
  const query = maintenanceFiltersToQuery(filters)
  if (page > 0) query.set('page', String(page + 1))
  return query.size ? `/manutencoes?${query}` : '/manutencoes'
}

export function MaintenanceScreen({ maintenances, summary, filters, vehicles, catalog }: {
  maintenances: Paged<MaintenanceOrder>
  summary: MaintenanceSummary
  filters: MaintenanceFilters
  vehicles: readonly MaintenanceVehicleOption[]
  catalog: readonly MaintenanceCatalogService[]
}) {
  const t = useTranslations('Maintenance.screen')
  const locale = useLocale()
  const router = useRouter()
  const { showToast } = useToast()
  const [formMode, setFormMode] = useState<'create' | 'edit'>()
  const [formTarget, setFormTarget] = useState<MaintenanceOrder>()
  const [viewTarget, setViewTarget] = useState<MaintenanceOrder>()
  const [confirmation, setConfirmation] = useState<Confirmation>()
  const [message, setMessage] = useState<string>()
  const [isMutating, startMutation] = useTransition()
  const [isLoadingEdit, startEditLoad] = useTransition()
  const pages = paginationWindow(maintenances.page, maintenances.totalPages)
  const unavailableShare = summary.totalVehicles === 0 ? 0 : summary.unavailableVehicles / summary.totalVehicles * 100

  function closeForm() {
    if (isLoadingEdit) return
    setFormMode(undefined)
    setFormTarget(undefined)
    setMessage(undefined)
  }

  function openEdit(order: MaintenanceOrder) {
    setFormMode('edit')
    setFormTarget(undefined)
    setMessage(undefined)
    startEditLoad(async () => {
      const result = await loadMaintenanceAction(order.id)
      if (result.status === 'error') {
        setMessage(result.message)
        showToast({ tone: 'error', title: t('loadFailed'), description: result.message })
      }
      else setFormTarget(result.maintenance)
    })
  }

  function runConfirmation() {
    if (!confirmation) return
    const selected = confirmation
    setMessage(undefined)
    startMutation(async () => {
      let result
      if (selected.kind === 'start') result = await startMaintenanceAction(selected.order.id)
      else if (selected.kind === 'finish') result = await finishMaintenanceAction(selected.order.id)
      else result = await deleteMaintenanceAction(selected.order.id)

      if (result.status === 'error') {
        setMessage(result.message)
        showToast({ tone: 'error', title: t('operationBlocked'), description: result.message })
        return
      }
      setConfirmation(undefined)
      router.refresh()

      if (selected.kind === 'start') {
        showToast({
          tone: 'success',
          title: t('startedTitle'),
          description: t('startedDescription', { plate: selected.order.vehiclePlate }),
        })
      }
      else if (selected.kind === 'finish') {
        showToast({
          tone: 'success',
          title: t('completedTitle'),
          description: t('completedDescription', { plate: selected.order.vehiclePlate }),
        })
      }
      else {
        showToast({
          tone: 'success',
          title: t('deletedTitle'),
          description: t('deletedDescription', { id: selected.order.id }),
        })
      }
    })
  }

  let confirmationCopy
  if (confirmation?.kind === 'start') {
    confirmationCopy = {
      title: t('confirm.startTitle'),
      description: t('confirm.startDescription', { plate: confirmation.order.vehiclePlate }),
      body: confirmation.order.plannedStart > todayLocalDate()
        ? t('confirm.earlyStartBody', { date: formatDate(confirmation.order.plannedStart, locale) })
        : t('confirm.startBody'),
      action: t('confirm.startAction'),
      icon: 'play_arrow',
      variant: 'primary' as const,
    }
  }
  else if (confirmation?.kind === 'finish') {
    confirmationCopy = {
      title: t('confirm.finishTitle'),
      description: t('confirm.finishDescription', { id: confirmation.order.id }),
      body: t('confirm.finishBody'),
      action: t('confirm.finishAction'),
      icon: 'check_circle',
      variant: 'primary' as const,
    }
  }
  else if (confirmation?.kind === 'delete') {
    confirmationCopy = {
      title: t('confirm.deleteTitle'),
      description: t('confirm.deleteDescription', { id: confirmation.order.id }),
      body: t('confirm.deleteBody'),
      action: t('confirm.deleteAction'),
      icon: 'delete',
      variant: 'danger' as const,
    }
  }

  return (
    <div className="space-y-5 lg:space-y-6">
      <div className="flex justify-stretch sm:justify-end">
        <Button variant="primary" className="h-10 w-full px-6 sm:w-auto" onClick={() => { setFormMode('create'); setFormTarget(undefined); setMessage(undefined) }}>
          <Icon name="add" className="text-[18px]" /> {t('scheduleButton')}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-gutter sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={t('metrics.unavailableVehicles')} icon="warning" accent="error" className="min-h-[120px] rounded-xs">
          <div className="flex items-baseline gap-2"><span className="font-data-mono text-[32px] leading-none">{formatInteger(summary.unavailableVehicles, locale)}</span><span className="text-body-sm text-on-surface-variant">{t('metrics.fleetTotal', { total: formatInteger(summary.totalVehicles, locale) })}</span></div>
          <ProgressBar value={unavailableShare} label={t('metrics.unavailableProgress')} trackClassName="bg-surface-variant" fillClassName="rounded-full bg-error" className="mt-2 h-1 w-full" />
        </MetricCard>
        <MetricCard label={t('metrics.monthCost')} icon="payments" accent="primary" className="min-h-[120px] rounded-xs">
          <span className="font-data-mono text-[26px] leading-none text-on-surface">{formatCurrency(summary.monthCost, locale)}</span>
          <span className="text-body-sm text-on-surface-variant">{t('metrics.monthCostHelp')}</span>
        </MetricCard>
        <MetricCard label={t('metrics.activeOrders')} icon="handyman" accent="tertiary-container" className="min-h-[120px] rounded-xs">
          <span className="font-data-mono text-[32px] leading-none text-on-surface">{formatInteger(summary.activeOrders, locale)}</span>
          <span className="text-body-sm text-on-surface-variant">{t('metrics.activeOrdersHelp')}</span>
        </MetricCard>
        <div className="flex min-h-[120px] flex-col justify-between rounded-xs border border-error bg-error-container/20 p-4">
          <div className="flex justify-between"><span className="font-label-caps text-label-caps font-bold uppercase text-on-error-container">{t('metrics.overdueTasks')}</span><Icon name="assignment_late" className="text-[20px] text-on-error-container" /></div>
          <span className="font-data-mono text-[32px] font-bold leading-none text-on-error-container">{formatInteger(summary.overdueTasks, locale)}</span>
          <span className="text-body-sm text-on-error-container">{t('metrics.overdueHelp')}</span>
        </div>
      </div>

      <MaintenanceToolbar filters={filters} vehicles={vehicles} />

      <div className="grid grid-cols-12 gap-gutter">
        <div className={`col-span-12 xl:col-span-8 ${PANEL}`}>
          <div className="border-b border-outline-variant bg-surface-container-low px-4 py-3">
            <h3 className="font-headline-sm text-headline-sm text-on-surface">{t('serviceLog')}</h3>
          </div>
          <ServiceLogTable
            orders={maintenances.items}
            onEdit={openEdit}
            onView={setViewTarget}
            onStart={(order) => { setConfirmation({ kind: 'start', order }); setMessage(undefined) }}
            onFinish={(order) => { setConfirmation({ kind: 'finish', order }); setMessage(undefined) }}
            onDelete={(order) => { setConfirmation({ kind: 'delete', order }); setMessage(undefined) }}
          />
          <TableFooter className="px-4 py-2">
            <span className="text-body-sm text-on-surface-variant">
              {maintenances.totalItems === 0 ? t('pagination.empty') : t('pagination.range', {
                first: formatInteger(maintenances.firstItem, locale),
                last: formatInteger(maintenances.lastItem, locale),
                total: formatInteger(maintenances.totalItems, locale),
              })}
            </span>
            <div className="flex items-center gap-1">
              <PaginationArrow direction="previous" href={maintenances.isFirst ? undefined : hrefForPage(filters, maintenances.page - 1)} />
              {pages.map((page) => (
                <Link key={page} href={hrefForPage(filters, page)} aria-current={page === maintenances.page ? 'page' : undefined}
                  className={`${PAGE_BUTTON} ${page === maintenances.page ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-low'}`}>
                  {formatInteger(page + 1, locale)}
                </Link>
              ))}
              <PaginationArrow direction="next" href={maintenances.isLast ? undefined : hrefForPage(filters, maintenances.page + 1)} />
            </div>
          </TableFooter>
        </div>

        <div className={`col-span-12 min-h-[360px] xl:col-span-4 ${PANEL}`}>
          <div className="border-b border-outline-variant bg-surface-container-low px-4 py-3">
            <h3 className="font-headline-sm text-headline-sm text-on-surface">{t('upcomingSchedule')}</h3>
          </div>
          <UpcomingSchedule items={summary.schedule} onSelect={setViewTarget} />
        </div>
      </div>

      <Modal open={formMode !== undefined} onClose={closeForm}
        title={formMode === 'create' ? t('formModal.createTitle') : t('formModal.editTitle')}
        description={formMode === 'create' ? t('formModal.createDescription') : formTarget ? t('formModal.editDescription', { id: formTarget.id }) : undefined}
        className="max-w-4xl">
        {isLoadingEdit && <div className="flex justify-center gap-2 py-10 text-on-surface-variant"><Icon name="progress_activity" className="animate-spin" /> {t('formModal.loading')}</div>}
        {message && formMode === 'edit' && !isLoadingEdit && <p role="alert" className="rounded-xs bg-error-container p-3 text-body-sm text-on-error-container">{message}</p>}
        {formMode === 'create' && <MaintenanceForm vehicles={vehicles} catalog={catalog} onSuccess={() => { closeForm(); router.refresh(); showToast({ tone: 'success', title: t('scheduledTitle'), description: t('scheduledDescription') }) }} onCancel={closeForm} />}
        {formMode === 'edit' && formTarget && <MaintenanceForm key={formTarget.id} maintenance={formTarget} vehicles={vehicles} catalog={catalog} onSuccess={() => { closeForm(); router.refresh(); showToast({ tone: 'success', title: t('updatedTitle'), description: t('updatedDescription', { id: formTarget.id }) }) }} onCancel={closeForm} />}
      </Modal>

      <Modal open={viewTarget !== undefined} onClose={() => setViewTarget(undefined)} title={t('detailsModal.title')}
        description={viewTarget ? t('detailsModal.description', { id: viewTarget.id }) : undefined} className="max-w-2xl">
        {viewTarget && <MaintenanceDetails order={viewTarget} />}
      </Modal>

      <Modal open={confirmation !== undefined} onClose={() => { if (!isMutating) setConfirmation(undefined); setMessage(undefined) }}
        title={confirmationCopy?.title ?? ''} description={confirmationCopy?.description}>
        {confirmationCopy && (
          <div className="space-y-4">
            <p className="text-body-sm text-on-surface-variant">{confirmationCopy.body}</p>
            {message && <p role="alert" className="rounded-xs bg-error-container p-3 text-body-sm text-on-error-container">{message}</p>}
            <div className="flex justify-end gap-2">
              <Button onClick={() => setConfirmation(undefined)} disabled={isMutating}>{t('confirm.cancel')}</Button>
              <Button variant={confirmationCopy.variant} onClick={runConfirmation} disabled={isMutating}>
                <Icon name={confirmationCopy.icon} className="text-[18px]" /> {isMutating ? t('confirm.processing') : confirmationCopy.action}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
