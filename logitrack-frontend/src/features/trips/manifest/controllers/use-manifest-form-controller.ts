'use client'

import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useEventCallback } from '@/shared/hooks/use-event-callback'
import {
  SpreadsheetImportError,
  dropHeaderRow,
  parseSheetNumber,
  parseSpreadsheet,
} from '@/shared/lib/spreadsheet-import'
import { useToast } from '@/shared/ui/use-toast'
import { issueManifestAction, updateManifestAction } from '../actions'
import {
  EMPTY_MANIFEST_FORM_STATE,
  type Manifest,
  type ManifestFormState,
} from '../model/manifest'

type FormAction = (previousState: ManifestFormState, formData: FormData) => Promise<ManifestFormState>

/** Linha da carga em edição. `key` só serve ao React; a sequência impressa é do backend. */
type ItemDraft = {
  key: number
  invoice: string
  recipient: string
  /** Texto cru do input: só vira número no cálculo e no envio. */
  volumes: string
  weightKg: string
}

/** Colunas do arquivo importado, na ordem. Também é a ordem do modelo baixável. */
const IMPORT_COLUMNS = ['nota', 'destinat', 'volume', 'peso'] as const

function emptyItem(key: number): ItemDraft {
  return { key, invoice: '', recipient: '', volumes: '', weightKg: '' }
}

function itemsFromManifest(manifest: Manifest | undefined): ItemDraft[] {
  if (!manifest || manifest.items.length === 0) return [emptyItem(0)]
  return manifest.items.map((item, index) => ({
    key: index,
    invoice: item.invoice,
    recipient: item.recipient,
    volumes: String(item.volumes),
    weightKg: String(item.weightKg),
  }))
}

/** Estado e ações compartilhados pela emissão e pela correção. */
export function useManifestFormController(
  stageId: number,
  onSaved: (manifestId: number) => void,
  existing?: Manifest,
) {
  const t = useTranslations('Manifest.form')
  const { showToast } = useToast()

  const action = useMemo<FormAction>(
    () => (existing
      ? updateManifestAction.bind(null, existing.id, stageId)
      : issueManifestAction.bind(null, stageId)),
    [existing, stageId],
  )
  const [state, formAction, isSubmitting] = useActionState<ManifestFormState, FormData>(
    action,
    EMPTY_MANIFEST_FORM_STATE,
  )

  const [items, setItems] = useState<ItemDraft[]>(() => itemsFromManifest(existing))
  const nextKey = useRef(items.length)
  const [importError, setImportError] = useState<string>()

  const addItem = useCallback(() => {
    setItems((current) => [...current, emptyItem(nextKey.current++)])
  }, [])

  const removeItem = useCallback((key: number) => {
    // Sempre resta uma linha: romaneio sem carga não existe e o backend recusa.
    setItems((current) => (current.length <= 1 ? current : current.filter((item) => item.key !== key)))
  }, [])

  const changeItem = useCallback((key: number, field: keyof Omit<ItemDraft, 'key'>, value: string) => {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, [field]: value } : item)))
  }, [])

  /** A importação substitui a carga para não duplicar notas em reimportações. */
  const importItems = useCallback(async (file: File) => {
    setImportError(undefined)
    try {
      const rows = dropHeaderRow(parseSpreadsheet(file.name, await file.text()), IMPORT_COLUMNS)
      const parsed = rows
        .map((row, index): ItemDraft => ({
          key: index,
          invoice: (row[0] ?? '').trim(),
          recipient: (row[1] ?? '').trim(),
          volumes: (row[2] ?? '').trim(),
          weightKg: (row[3] ?? '').trim(),
        }))
        .filter((item) => item.invoice || item.recipient)

      if (parsed.length === 0) {
        setImportError(t('importEmpty'))
        return
      }

      setItems(parsed)
      nextKey.current = parsed.length
      showToast({ tone: 'success', title: t('importedTitle'), description: t('importedDescription', { count: parsed.length }) })
    } catch (error) {
      const reason = error instanceof SpreadsheetImportError ? error.reason : 'malformed'
      setImportError(reason === 'unsupported' ? t('importUnsupported') : t('importMalformed'))
    }
  }, [showToast, t])

  const totals = useMemo(() => {
    let volumes = 0
    let weight = 0
    for (const item of items) {
      const parsedVolumes = parseSheetNumber(item.volumes)
      const parsedWeight = parseSheetNumber(item.weightKg)
      if (Number.isFinite(parsedVolumes)) volumes += parsedVolumes
      if (Number.isFinite(parsedWeight)) weight += parsedWeight
    }
    return { volumes, weight }
  }, [items])

  const emitSaved = useEventCallback(onSaved)
  const handledState = useRef<ManifestFormState>(undefined)

  // Identidade estável + marca do estado já tratado: ver `use-event-callback`.
  useEffect(() => {
    if (handledState.current === state) return
    handledState.current = state

    if (state.status === 'success' && state.createdId !== undefined) emitSaved(state.createdId)
    if (state.status === 'error' && state.message) {
      showToast({ tone: 'error', title: t('issueFailed'), description: state.message })
    }
  }, [state, emitSaved, showToast, t])

  return {
    formAction,
    isSubmitting,
    isEditing: existing !== undefined,
    items,
    addItem,
    removeItem,
    changeItem,
    canRemoveItem: items.length > 1,
    importItems,
    importError,
    totals,
    errorMessage: state.message,
    fieldError: (field: string) => state.fieldErrors?.[field],
  }
}
