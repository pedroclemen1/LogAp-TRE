'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/shared/ui/button'
import { Icon } from '@/shared/ui/icon'
import { IconButton } from '@/shared/ui/icon-button'
import { Modal } from '@/shared/ui/modal'
import { Surface } from '@/shared/ui/surface'
import { useToast } from '@/shared/ui/use-toast'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { deactivateMaintenanceServiceAction, reactivateMaintenanceServiceAction } from '../actions'
import type { MaintenanceServiceItem, ReferenceFilters } from '../model/reference-data'
import { MaintenanceServiceForm } from './maintenance-service-form'
import { RecordStatusBadge } from './record-status-badge'
import { ReferenceToolbar } from './reference-toolbar'

export function MaintenanceServicesScreen({ services, filters, canManage }: {
  services: readonly MaintenanceServiceItem[]
  filters: ReferenceFilters
  canManage: boolean
}) {
  const t = useTranslations('Reference.services')
  const router = useRouter()
  const { showToast } = useToast()
  const [formTarget, setFormTarget] = useState<MaintenanceServiceItem | null>()
  const [deactivateTarget, setDeactivateTarget] = useState<MaintenanceServiceItem>()
  const [message, setMessage] = useState<string>()
  const [isPending, startTransition] = useTransition()

  function refreshAndClose(success?: { title: string; description: string }) {
    setFormTarget(undefined)
    setDeactivateTarget(undefined)
    setMessage(undefined)
    router.refresh()
    if (success) showToast({ tone: 'success', ...success })
  }

  function deactivate() {
    if (!deactivateTarget) return
    setMessage(undefined)
    startTransition(async () => {
      const result = await deactivateMaintenanceServiceAction(deactivateTarget.id)
      if (result.status === 'error') {
        const description = result.message ?? t('deactivateFallback')
        setMessage(description)
        showToast({ tone: 'error', title: t('deactivateFailed'), description })
      } else refreshAndClose({ title: t('deactivatedTitle'), description: t('deactivatedDescription', { name: deactivateTarget.name }) })
    })
  }

  function reactivate(service: MaintenanceServiceItem) {
    setMessage(undefined)
    startTransition(async () => {
      const result = await reactivateMaintenanceServiceAction(service.id)
      if (result.status === 'error') {
        const description = result.message ?? t('reactivateFallback')
        setMessage(description)
        showToast({ tone: 'error', title: t('reactivateFailed'), description })
      } else {
        router.refresh()
        showToast({ tone: 'success', title: t('reactivatedTitle'), description: t('reactivatedDescription', { name: service.name }) })
      }
    })
  }

  return (
    <div className="space-y-5 lg:space-y-6">
      {canManage && (
        <div className="flex justify-stretch sm:justify-end">
          <Button variant="primary" onClick={() => setFormTarget(null)} className="h-10 w-full px-6 sm:w-auto">
            <Icon name="add" className="text-[18px]" /> {t('addButton')}
          </Button>
        </div>
      )}
      <ReferenceToolbar pathname="/servicos-manutencao" filters={filters} placeholder={t('searchPlaceholder')} />
      {message && !deactivateTarget && (
        <p role="alert" className="rounded-xs bg-error-container px-4 py-3 text-body-sm text-on-error-container">{message}</p>
      )}
      <Surface className="overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table className="min-w-[560px]">
            <TableHeader className="border-b border-outline-variant bg-table-header">
              <TableRow>
                <TableHead className="w-24 px-4 py-3">{t('table.id')}</TableHead>
                <TableHead className="px-4 py-3">{t('table.name')}</TableHead>
                <TableHead className="w-36 px-4 py-3">{t('table.status')}</TableHead>
                {canManage && <TableHead className="w-28 px-4 py-3 text-right">{t('table.actions')}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-outline-variant/50 bg-surface">
              {services.length === 0 && (
                <TableRow><TableCell colSpan={canManage ? 4 : 3} className="p-8 text-center text-on-surface-variant">{t('table.empty')}</TableCell></TableRow>
              )}
              {services.map((service) => (
                <TableRow key={service.id} className="h-compact-row-height hover:bg-surface-container-low">
                  <TableCell className="px-4 py-2 font-data-mono text-data-mono text-on-surface-variant">#{service.id}</TableCell>
                  <TableCell className="px-4 py-2 font-medium text-on-surface">{service.name}</TableCell>
                  <TableCell className="px-4 py-2"><RecordStatusBadge active={service.active} /></TableCell>
                  {canManage && (
                    <TableCell className="px-4 py-2">
                      <div className="flex justify-end gap-1">
                        <IconButton aria-label={t('editAria', { name: service.name })} title={t('edit')} icon="edit" className="h-7 w-7 text-primary" iconClassName="text-[17px]" onClick={() => setFormTarget(service)} />
                        {service.active ? (
                          <IconButton aria-label={t('deactivateAria', { name: service.name })} title={t('deactivate')} icon="delete" className="h-7 w-7 text-error" iconClassName="text-[17px]" onClick={() => { setMessage(undefined); setDeactivateTarget(service) }} />
                        ) : (
                          <IconButton aria-label={t('reactivateAria', { name: service.name })} title={t('reactivate')} icon="restore" className="h-7 w-7 text-primary" iconClassName="text-[17px]" disabled={isPending} onClick={() => reactivate(service)} />
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="border-t border-outline-variant bg-surface-container-lowest px-4 py-3 text-body-sm text-on-surface-variant">
          {t('displayed', { count: services.length })}
        </div>
      </Surface>

      {canManage && (
        <Modal
          open={formTarget !== undefined}
          onClose={() => setFormTarget(undefined)}
          title={formTarget ? t('formModal.editTitle') : t('formModal.addTitle')}
          description={formTarget ? t('formModal.editDescription', { name: formTarget.name }) : t('formModal.addDescription')}
        >
          {formTarget !== undefined && (
            <MaintenanceServiceForm
              key={formTarget?.id ?? 'new'}
              service={formTarget ?? undefined}
              onSuccess={() => refreshAndClose({
                title: formTarget ? t('updatedTitle') : t('createdTitle'),
                description: formTarget ? t('updatedDescription', { name: formTarget.name }) : t('createdDescription'),
              })}
              onCancel={() => setFormTarget(undefined)}
            />
          )}
        </Modal>
      )}

      {canManage && (
        <Modal
          open={deactivateTarget !== undefined}
          onClose={() => { if (!isPending) setDeactivateTarget(undefined) }}
          title={t('deactivateModal.title')}
          description={deactivateTarget ? t('deactivateModal.description', { name: deactivateTarget.name }) : undefined}
        >
          <div className="space-y-4">
            <p className="text-body-sm text-on-surface-variant">
              {t('deactivateModal.body')}
            </p>
            {message && <p role="alert" className="rounded-xs bg-error-container px-3 py-2 text-body-sm text-on-error-container">{message}</p>}
            <div className="flex justify-end gap-2">
              <Button onClick={() => setDeactivateTarget(undefined)} disabled={isPending}>{t('deactivateModal.cancel')}</Button>
              <Button variant="danger" onClick={deactivate} disabled={isPending}>
                <Icon name="delete" className="text-[18px]" /> {isPending ? t('deactivateModal.deactivating') : t('deactivateModal.confirm')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
