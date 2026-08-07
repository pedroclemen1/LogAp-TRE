'use client'

import { useCallback, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useToast } from '@/shared/ui/use-toast'
import { deleteVehiclesAction } from '../actions'
import type { FleetVehicle } from '../model/vehicle'

export function useFleetRowActionsController(vehicles: readonly FleetVehicle[]) {
  const t = useTranslations('Fleet.toasts')
  const router = useRouter()
  const { showToast } = useToast()
  const [editingVehicle, setEditingVehicle] = useState<FleetVehicle>()
  const [deleteTarget, setDeleteTarget] = useState<FleetVehicle>()
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set())
  const [bulkConfirmationOpen, setBulkConfirmationOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string>()
  const [isDeleting, startDeleteTransition] = useTransition()

  const resetSelection = useCallback(() => {
    setSelectionMode(false)
    setSelectedIds(new Set())
    setBulkConfirmationOpen(false)
    setDeleteError(undefined)
  }, [])

  const runDelete = useCallback((ids: number[]) => {
    setDeleteError(undefined)
    startDeleteTransition(async () => {
      const result = await deleteVehiclesAction(ids)
      if (result.status === 'error') {
        setDeleteError(result.message)
        showToast({ tone: 'error', title: t('deleteBlocked'), description: result.message })
        return
      }

      setDeleteTarget(undefined)
      resetSelection()
      router.refresh()
      showToast({
        tone: 'success',
        title: t('deletedTitle', { count: ids.length }),
        description: t('deletedDescription', { count: ids.length }),
      })
    })
  }, [resetSelection, router, showToast, t])

  const requestDelete = useCallback((vehicle: FleetVehicle) => {
    setDeleteError(undefined)
    setDeleteTarget(vehicle)
  }, [])

  const deleteOnlyTarget = useCallback(() => {
    if (deleteTarget) runDelete([deleteTarget.id])
  }, [deleteTarget, runDelete])

  const selectOthers = useCallback(() => {
    if (!deleteTarget) return
    setSelectedIds(new Set([deleteTarget.id]))
    setSelectionMode(true)
    setDeleteTarget(undefined)
    setDeleteError(undefined)
  }, [deleteTarget])

  const toggleVehicle = useCallback((id: number) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    setSelectedIds((current) => {
      const visibleIds = vehicles.map((vehicle) => vehicle.id)
      const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => current.has(id))
      return allVisibleSelected ? new Set() : new Set(visibleIds)
    })
  }, [vehicles])

  const selected = vehicles.filter((vehicle) => selectedIds.has(vehicle.id))
  const allVisibleSelected = vehicles.length > 0 && vehicles.every((vehicle) => selectedIds.has(vehicle.id))

  return {
    editingVehicle,
    openEdit: setEditingVehicle,
    closeEdit: () => setEditingVehicle(undefined),
    deleteTarget,
    closeDeletePrompt: () => {
      if (!isDeleting) setDeleteTarget(undefined)
      setDeleteError(undefined)
    },
    requestDelete,
    deleteOnlyTarget,
    selectOthers,
    selectionMode,
    selectedIds,
    selected,
    allVisibleSelected,
    toggleVehicle,
    toggleAll,
    cancelSelection: resetSelection,
    bulkConfirmationOpen,
    openBulkConfirmation: () => {
      setDeleteError(undefined)
      setBulkConfirmationOpen(true)
    },
    closeBulkConfirmation: () => {
      if (!isDeleting) setBulkConfirmationOpen(false)
      setDeleteError(undefined)
    },
    confirmBulkDelete: () => runDelete(selected.map((vehicle) => vehicle.id)),
    deleteError,
    isDeleting,
    refresh: router.refresh,
  }
}
