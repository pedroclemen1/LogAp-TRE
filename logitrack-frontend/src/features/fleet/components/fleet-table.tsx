'use client'

import { Button } from '@/shared/ui/button'
import { useLocale, useTranslations } from 'next-intl'
import { Checkbox } from '@/shared/ui/checkbox'
import { Icon } from '@/shared/ui/icon'
import { IconButton } from '@/shared/ui/icon-button'
import { Modal } from '@/shared/ui/modal'
import { useToast } from '@/shared/ui/use-toast'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { formatDate, formatDateTime, formatKilometers } from '@/shared/lib/format'
import { useFleetRowActionsController } from '../controllers/use-fleet-row-actions-controller'
import type { FleetVehicle } from '../model/vehicle'
import { VehicleForm } from './vehicle-form'
import { VehicleStatusBadge } from './vehicle-status-badge'

const EMPTY = '—'
const TH = 'px-4 py-2 font-medium tracking-wider'
const MUTED_CELL = 'text-on-surface-variant font-data-mono text-[11px]'
const CHECKBOX = 'w-4 h-4'

function DeleteError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-xs bg-error-container px-3 py-2 font-body-sm text-body-sm text-on-error-container">
      {message}
    </p>
  )
}

export function FleetTable({ vehicles }: { vehicles: readonly FleetVehicle[] }) {
  const t = useTranslations('Fleet.table')
  const locale = useLocale()
  const controller = useFleetRowActionsController(vehicles)
  const { showToast } = useToast()

  return (
    <>
      {controller.selectionMode && (
        <div className="flex flex-col gap-3 border-b border-outline-variant bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-body-sm text-body-sm font-medium text-on-surface">
              {t('selected', { count: controller.selected.length })}
            </p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {t('selectionHelp')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={controller.cancelSelection}>
              {t('cancel')}
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={controller.selected.length === 0}
              onClick={controller.openBulkConfirmation}
            >
              <Icon name="delete" className="text-[18px]" />
              {t('deleteSelected')}
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <Table className="min-w-[1000px]">
          <TableHeader>
            <TableRow className="bg-surface-container-low border-b border-outline-variant font-label-caps text-label-caps text-on-surface-variant h-compact-row-height">
              <TableHead className={TH}>{t('plate')}</TableHead>
              <TableHead className={TH}>{t('modelCategory')}</TableHead>
              <TableHead className={`${TH} text-right`}>{t('mileage')}</TableHead>
              <TableHead className={TH}>{t('status')}</TableHead>
              <TableHead className={TH}>{t('lastTrip')}</TableHead>
              <TableHead className={TH}>{t('nextMaintenance')}</TableHead>
              <TableHead className="px-4 py-2 w-24 text-center">
                {controller.selectionMode ? (
                  <Checkbox
                    aria-label={t('selectAll')}
                    checked={controller.allVisibleSelected}
                    onChange={controller.toggleAll}
                    className={CHECKBOX}
                  />
                ) : (
                  <span>{t('actions')}</span>
                )}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="font-body-sm text-body-sm divide-y divide-outline-variant/50">
            {vehicles.length === 0 && (
              <TableRow className="h-compact-row-height">
                <TableCell colSpan={7} className="px-4 py-8 text-center text-on-surface-variant">
                  {t('empty')}
                </TableCell>
              </TableRow>
            )}

            {vehicles.map((vehicle, index) => (
              <TableRow
                key={vehicle.id}
                className={`h-compact-row-height transition-colors hover:bg-surface-container-lowest ${
                  index % 2 === 1 ? 'bg-surface-container-lowest/30' : ''
                }`}
              >
                <TableCell className="px-4 py-1">
                  <span className="font-data-mono text-data-mono font-bold text-primary">{vehicle.plate}</span>
                </TableCell>
                <TableCell className="px-4 py-1">
                  <div className="flex flex-col justify-center">
                    <span className="font-medium text-on-surface">{vehicle.model}</span>
                    <span className="text-on-surface-variant text-[10px]">{t(`category.${vehicle.category}`)}</span>
                  </div>
                </TableCell>
                <TableCell className="px-4 py-1 font-data-mono text-data-mono text-right text-on-surface">
                  {formatKilometers(vehicle.odometerKm, locale)}
                </TableCell>
                <TableCell className="px-4 py-1">
                  <VehicleStatusBadge status={vehicle.status} />
                </TableCell>
                <TableCell className={`px-4 py-1 ${MUTED_CELL}`}>
                  {vehicle.lastTripAt ? formatDateTime(vehicle.lastTripAt, locale) : EMPTY}
                </TableCell>
                <TableCell
                  className={`px-4 py-1 ${
                    vehicle.nextMaintenance?.overdue
                      ? 'text-error font-data-mono text-[11px] font-bold'
                      : MUTED_CELL
                  }`}
                >
                  {vehicle.nextMaintenance ? formatDate(vehicle.nextMaintenance.scheduledFor, locale) : EMPTY}
                </TableCell>
                <TableCell className="px-4 py-1 text-center">
                  {controller.selectionMode ? (
                    <Checkbox
                      aria-label={t('selectVehicle', { plate: vehicle.plate })}
                      checked={controller.selectedIds.has(vehicle.id)}
                      onChange={() => controller.toggleVehicle(vehicle.id)}
                      className={CHECKBOX}
                    />
                  ) : (
                    <div className="flex items-center justify-center gap-1">
                      <IconButton
                        aria-label={t('editVehicle', { plate: vehicle.plate })}
                        title={t('editVehicle', { plate: vehicle.plate })}
                        icon="edit"
                        iconClassName="text-[17px]"
                        className="h-7 w-7 text-primary"
                        onClick={() => controller.openEdit(vehicle)}
                      />
                      <IconButton
                        aria-label={t('deleteVehicle', { plate: vehicle.plate })}
                        title={t('deleteVehicle', { plate: vehicle.plate })}
                        icon="delete"
                        iconClassName="text-[17px]"
                        className="h-7 w-7 text-error"
                        onClick={() => controller.requestDelete(vehicle)}
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
        open={controller.editingVehicle !== undefined}
        onClose={controller.closeEdit}
        title={t('editTitle')}
        description={controller.editingVehicle ? t('editDescription', { plate: controller.editingVehicle.plate }) : undefined}
      >
        {controller.editingVehicle && (
          <VehicleForm
            key={controller.editingVehicle.id}
            vehicle={controller.editingVehicle}
            onSuccess={() => {
              controller.closeEdit()
              controller.refresh()
              showToast({ tone: 'success', title: t('updatedTitle'), description: t('updatedDescription') })
            }}
            onCancel={controller.closeEdit}
          />
        )}
      </Modal>

      <Modal
        open={controller.deleteTarget !== undefined}
        onClose={controller.closeDeletePrompt}
        title={t('deleteTitle')}
        description={controller.deleteTarget ? t('deleteDescription', { plate: controller.deleteTarget.plate }) : undefined}
      >
        <div className="flex flex-col gap-4">
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {t('deleteProtected')}
          </p>
          <DeleteError message={controller.deleteError} />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={controller.closeDeletePrompt} disabled={controller.isDeleting}>
              {t('cancel')}
            </Button>
            <Button variant="secondary" onClick={controller.selectOthers} disabled={controller.isDeleting}>
              <Icon name="checklist" className="text-[18px]" />
              {t('selectOthers')}
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
        title={t('bulkDeleteTitle')}
        description={t('bulkDeleteDescription', { count: controller.selected.length })}
      >
        <div className="flex flex-col gap-4">
          <div className="max-h-32 overflow-y-auto rounded-xs border border-outline-variant bg-surface-container-low p-3">
            <p className="font-data-mono text-data-mono text-on-surface">
              {controller.selected.map((vehicle) => vehicle.plate).join(', ')}
            </p>
          </div>
          <DeleteError message={controller.deleteError} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={controller.closeBulkConfirmation} disabled={controller.isDeleting}>
              {t('back')}
            </Button>
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
