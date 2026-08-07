'use client'

import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { Button } from '@/shared/ui/button'
import { Checkbox } from '@/shared/ui/checkbox'
import { Icon } from '@/shared/ui/icon'
import { IconButton } from '@/shared/ui/icon-button'
import { Modal } from '@/shared/ui/modal'
import { RoutePath } from '@/shared/ui/route-path'
import { useToast } from '@/shared/ui/use-toast'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { formatDateTime, formatKilometers } from '@/shared/lib/format'
import { useTripRowActionsController } from '../controllers/use-trip-row-actions-controller'
import { tripRoutePath, type DriverOption, type Trip, type VehicleOption } from '../model/trip'
import { TripForm } from './trip-form'
import { TripStatusBadge } from './trip-status-badge'

const TH = 'p-3 tracking-wider'
const ACTION = 'h-7 w-7'

function DeleteError({ message }: { message?: string }) {
  return message ? (
    <p role="alert" className="rounded-xs bg-error-container px-3 py-2 font-body-sm text-body-sm text-on-error-container">
      {message}
    </p>
  ) : null
}

export function TripsTable({
  trips,
  vehicles,
  drivers,
}: {
  trips: readonly Trip[]
  vehicles: readonly VehicleOption[]
  drivers: readonly DriverOption[]
}) {
  const t = useTranslations('Trips.table')
  const locale = useLocale()
  const controller = useTripRowActionsController(trips)
  const { showToast } = useToast()

  return (
    <>
      {controller.selectionMode && (
        <div className="flex flex-col gap-3 border-b border-outline-variant bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-body-sm text-body-sm font-medium text-on-surface">
              {t('selectedCount', { count: controller.selected.length })}
            </p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {t('selectionHelp')}
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={controller.cancelSelection}>{t('cancel')}</Button>
            <Button
              size="sm"
              variant="danger"
              disabled={controller.selected.length === 0}
              onClick={controller.openBulkConfirmation}
            >
              <Icon name="delete" className="text-[18px]" /> {t('deleteSelected')}
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <Table className="min-w-[1040px]">
          <TableHeader className="border-b border-outline-variant bg-table-header">
            <TableRow>
              <TableHead className={TH}>{t('vehicle')}</TableHead>
              <TableHead className={TH}>{t('departure')}</TableHead>
              <TableHead className={TH}>{t('route')}</TableHead>
              <TableHead className={TH}>{t('distance')}</TableHead>
              <TableHead className={TH}>{t('status')}</TableHead>
              <TableHead className={`${TH} w-28 text-right`}>
                {controller.selectionMode ? (
                  <Checkbox
                    aria-label={t('selectAllAria')}
                    checked={controller.allVisibleSelected}
                    onChange={controller.toggleAll}
                  />
                ) : t('actions')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-outline-variant/50 bg-surface">
            {trips.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="p-8 text-center text-on-surface-variant">
                  {t('empty')}
                </TableCell>
              </TableRow>
            )}
            {trips.map((trip) => (
              <TableRow key={trip.id} className="h-compact-row-height transition-colors hover:bg-surface-container-low">
                <TableCell className="p-3">
                  <div className="flex flex-col">
                    <span className="font-data-mono text-data-mono font-bold text-on-surface">{trip.vehiclePlate}</span>
                    <span className="text-[10px] text-on-surface-variant">{trip.vehicleModel}</span>
                  </div>
                </TableCell>
                <TableCell className="p-3 font-data-mono text-data-mono text-on-surface-variant">
                  {formatDateTime(trip.departureAt, locale)}
                </TableCell>
                <TableCell className="p-3">
                  <RoutePath path={tripRoutePath(trip)} />
                </TableCell>
                <TableCell className="p-3 font-data-mono text-data-mono text-on-surface-variant">
                  {formatKilometers(trip.distanceKm, locale)}
                </TableCell>
                <TableCell className="p-3"><TripStatusBadge status={trip.status} /></TableCell>
                <TableCell className="p-3 text-right">
                  {controller.selectionMode ? (
                    <Checkbox
                      aria-label={t('selectAria', { id: trip.id })}
                      checked={controller.selectedIds.has(trip.id)}
                      disabled={trip.status === 'in_progress'}
                      onChange={() => controller.toggleTrip(trip.id)}
                    />
                  ) : (
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/viagens/${trip.id}`}
                        title={t('view')}
                        aria-label={t('viewAria', { id: trip.id })}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-xs text-on-surface-variant hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
                      >
                        <Icon name="visibility" className="text-[17px]" />
                      </Link>
                      <IconButton
                        aria-label={t('editAria', { id: trip.id })}
                        title={trip.status === 'canceled' || trip.status === 'completed' ? t('cannotEdit') : t('edit')}
                        icon="edit"
                        iconClassName="text-[17px]"
                        className={`${ACTION} text-primary`}
                        disabled={trip.status === 'canceled' || trip.status === 'completed'}
                        onClick={() => controller.openEdit(trip)}
                      />
                      <IconButton
                        aria-label={t('deleteAria', { id: trip.id })}
                        title={trip.status === 'in_progress' ? t('cannotDeleteActive') : t('delete')}
                        icon="delete"
                        iconClassName="text-[17px]"
                        className={`${ACTION} text-error`}
                        disabled={trip.status === 'in_progress'}
                        onClick={() => controller.requestDelete(trip)}
                      />
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Modal
        open={controller.editingTrip !== undefined}
        onClose={controller.closeEdit}
        title={t('editTitle')}
        description={controller.editingTrip ? t('editDescription', { id: controller.editingTrip.id }) : undefined}
        className="max-w-3xl"
      >
        {controller.isLoadingEdit && (
          <div className="flex items-center justify-center gap-2 py-10 text-on-surface-variant">
            <Icon name="progress_activity" className="animate-spin text-[22px]" /> {t('loadingSegments')}
          </div>
        )}
        {controller.editLoadError && (
          <div className="space-y-4 py-4">
            <p role="alert" className="rounded-xs bg-error-container px-3 py-2 font-body-sm text-body-sm text-on-error-container">
              {controller.editLoadError}
            </p>
            <div className="flex justify-end">
              <Button onClick={controller.retryEdit}><Icon name="refresh" className="text-[18px]" /> {t('tryAgain')}</Button>
            </div>
          </div>
        )}
        {controller.editingTrip && controller.editingDetails && (
          <TripForm
            key={controller.editingTrip.id}
            trip={controller.editingTrip}
            stages={controller.editingDetails.stages}
            vehicles={vehicles}
            drivers={drivers}
            onSuccess={() => {
              controller.closeEdit()
              controller.refresh()
              showToast({ tone: 'success', title: t('updatedTitle'), description: t('updatedDescription', { id: controller.editingTrip?.id ?? '' }) })
            }}
            onCancel={controller.closeEdit}
          />
        )}
      </Modal>

      <Modal
        open={controller.deleteTarget !== undefined}
        onClose={controller.closeDeletePrompt}
        title={t('deleteTitle')}
        description={controller.deleteTarget ? t('deleteDescription', { id: controller.deleteTarget.id }) : undefined}
      >
        <div className="space-y-4">
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {t('deleteBody')}
          </p>
          <DeleteError message={controller.deleteError} />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button onClick={controller.closeDeletePrompt} disabled={controller.isDeleting}>{t('cancel')}</Button>
            <Button onClick={controller.selectOthers} disabled={controller.isDeleting}>
              <Icon name="checklist" className="text-[18px]" /> {t('selectOthers')}
            </Button>
            <Button variant="danger" onClick={controller.deleteOnlyTarget} disabled={controller.isDeleting}>
              <Icon name="delete" className="text-[18px]" />
              {controller.isDeleting ? t('deleting') : t('deleteOnly')}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={controller.bulkConfirmationOpen}
        onClose={controller.closeBulkConfirmation}
        title={t('deleteSelectedTitle')}
        description={t('willBeDeleted', { count: controller.selected.length })}
      >
        <div className="space-y-4">
          <p className="rounded-xs border border-outline-variant bg-surface-container-low p-3 font-data-mono text-data-mono">
            {controller.selected.map((trip) => `#${trip.id}`).join(', ')}
          </p>
          <DeleteError message={controller.deleteError} />
          <div className="flex justify-end gap-2">
            <Button onClick={controller.closeBulkConfirmation} disabled={controller.isDeleting}>{t('back')}</Button>
            <Button variant="danger" onClick={controller.confirmBulkDelete} disabled={controller.isDeleting}>
              <Icon name="delete" className="text-[18px]" />
              {controller.isDeleting ? t('deleting') : t('confirmDeletion')}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
