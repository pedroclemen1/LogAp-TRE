'use client'

import { useCallback, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useToast } from '@/shared/ui/use-toast'
import { deleteTripsAction, loadTripDetailsAction } from '../actions'
import type { Trip, TripDetails } from '../model/trip'

export function useTripRowActionsController(trips: readonly Trip[]) {
  const t = useTranslations('Trips.table')
  const router = useRouter()
  const { showToast } = useToast()
  const [editingTrip, setEditingTrip] = useState<Trip>()
  const [editingDetails, setEditingDetails] = useState<TripDetails>()
  const [editLoadError, setEditLoadError] = useState<string>()
  const [deleteTarget, setDeleteTarget] = useState<Trip>()
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set())
  const [bulkConfirmationOpen, setBulkConfirmationOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string>()
  const [isDeleting, startDeleteTransition] = useTransition()
  const [isLoadingEdit, startEditTransition] = useTransition()

  const openEdit = useCallback((trip: Trip) => {
    setEditingTrip(trip)
    setEditingDetails(undefined)
    setEditLoadError(undefined)
    startEditTransition(async () => {
      const result = await loadTripDetailsAction(trip.id)
      if (result.status === 'error') {
        setEditLoadError(result.message)
        showToast({ tone: 'error', title: t('loadFailed'), description: result.message })
        return
      }
      setEditingDetails(result.details)
    })
  }, [showToast, t])

  const closeEdit = useCallback(() => {
    if (isLoadingEdit) return
    setEditingTrip(undefined)
    setEditingDetails(undefined)
    setEditLoadError(undefined)
  }, [isLoadingEdit])

  const resetSelection = useCallback(() => {
    setSelectionMode(false)
    setSelectedIds(new Set())
    setBulkConfirmationOpen(false)
    setDeleteError(undefined)
  }, [])

  const runDelete = useCallback((ids: number[]) => {
    setDeleteError(undefined)
    startDeleteTransition(async () => {
      const result = await deleteTripsAction(ids)
      if (result.status === 'error') {
        setDeleteError(result.message)
        showToast({ tone: 'error', title: t('deletionBlocked'), description: result.message })
        return
      }
      setDeleteTarget(undefined)
      resetSelection()
      router.refresh()
      showToast({
        tone: 'success',
        title: ids.length === 1 ? t('deletedTitle') : t('deletedManyTitle'),
        description: ids.length === 1 ? t('deletedDescription') : t('deletedManyDescription', { count: ids.length }),
      })
    })
  }, [resetSelection, router, showToast, t])

  const selectOthers = useCallback(() => {
    if (!deleteTarget) return
    setSelectedIds(new Set([deleteTarget.id]))
    setSelectionMode(true)
    setDeleteTarget(undefined)
    setDeleteError(undefined)
  }, [deleteTarget])

  const toggleTrip = useCallback((id: number) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    setSelectedIds((current) => {
      const visibleIds = trips.filter((trip) => trip.status !== 'in_progress').map((trip) => trip.id)
      const allSelected = visibleIds.length > 0 && visibleIds.every((id) => current.has(id))
      return allSelected ? new Set() : new Set(visibleIds)
    })
  }, [trips])

  const selected = trips.filter((trip) => selectedIds.has(trip.id))

  return {
    editingTrip,
    editingDetails,
    editLoadError,
    isLoadingEdit,
    openEdit,
    retryEdit: () => {
      if (editingTrip) openEdit(editingTrip)
    },
    closeEdit,
    deleteTarget,
    requestDelete: (trip: Trip) => {
      setDeleteError(undefined)
      setDeleteTarget(trip)
    },
    closeDeletePrompt: () => {
      if (!isDeleting) setDeleteTarget(undefined)
      setDeleteError(undefined)
    },
    deleteOnlyTarget: () => {
      if (deleteTarget) runDelete([deleteTarget.id])
    },
    selectOthers,
    selectionMode,
    selectedIds,
    selected,
    allVisibleSelected: trips.some((trip) => trip.status !== 'in_progress')
      && trips.filter((trip) => trip.status !== 'in_progress').every((trip) => selectedIds.has(trip.id)),
    toggleTrip,
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
    confirmBulkDelete: () => runDelete(selected.map((trip) => trip.id)),
    deleteError,
    isDeleting,
    refresh: router.refresh,
  }
}
