'use server'

import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'
import { ApiRequestError, UnauthorizedError } from '@/shared/api/api-error'
import { redirectToExpiredSession } from '@/shared/api/require-session'
import { fetchManifest, issueManifest, updateManifest } from './api/manifest-api'
import type { ManifestInputDto, ManifestItemInputDto } from './api/manifest-dto'
import type { Manifest, ManifestFormState } from './model/manifest'

const MAX_ITEMS = 50

type Translate = Awaited<ReturnType<typeof getTranslations<'Manifest.validation'>>>

type ParsedForm =
  | { fieldErrors: Record<string, string>; input?: undefined }
  | { fieldErrors?: undefined; input: Omit<ManifestInputDto, 'viagemEtapaId'> }

/** Validação compartilhada pela emissão e pela correção. */
function parseManifestForm(formData: FormData, t: Translate): ParsedForm {
  const fieldErrors: Record<string, string> = {}
  const text = (field: string) => String(formData.get(field) ?? '').trim()

  const carrierName = text('transportadoraRazaoSocial')
  const carrierTaxId = text('transportadoraCnpj')
  const vehicleDescription = text('veiculoDescricao')

  if (!carrierName) fieldErrors.transportadoraRazaoSocial = t('requiredCarrierName')
  if (!carrierTaxId) fieldErrors.transportadoraCnpj = t('requiredCarrierTaxId')
  if (!vehicleDescription) fieldErrors.veiculoDescricao = t('requiredVehicleDescription')

  const itemCount = Number(formData.get('itensQuantidade'))
  if (!Number.isInteger(itemCount) || itemCount < 1 || itemCount > MAX_ITEMS) {
    fieldErrors.itens = t('itemCount', { max: MAX_ITEMS })
  }

  const items: ManifestItemInputDto[] = []
  const seenInvoices = new Set<string>()

  if (Number.isInteger(itemCount) && itemCount >= 1 && itemCount <= MAX_ITEMS) {
    for (let index = 0; index < itemCount; index += 1) {
      const prefix = `itens[${index}]`
      const invoice = text(`${prefix}.notaFiscal`)
      const recipient = text(`${prefix}.destinatario`)
      const volumes = Number(text(`${prefix}.volumes`))
      const weight = Number(text(`${prefix}.pesoKg`))

      if (!invoice) fieldErrors[`${prefix}.notaFiscal`] = t('requiredInvoice')
      if (!recipient) fieldErrors[`${prefix}.destinatario`] = t('requiredRecipient')
      if (!Number.isInteger(volumes) || volumes < 1) fieldErrors[`${prefix}.volumes`] = t('invalidVolumes')
      if (!Number.isFinite(weight) || weight < 0) fieldErrors[`${prefix}.pesoKg`] = t('invalidWeight')

      // Aponta a linha duplicada antes do 422 genérico do backend.
      if (invoice) {
        const normalized = invoice.toLowerCase()
        if (seenInvoices.has(normalized)) fieldErrors[`${prefix}.notaFiscal`] = t('duplicateInvoice')
        seenInvoices.add(normalized)
      }

      if (invoice && recipient && Number.isInteger(volumes) && volumes >= 1
          && Number.isFinite(weight) && weight >= 0) {
        items.push({ notaFiscal: invoice, destinatario: recipient, volumes, pesoKg: weight })
      }
    }
  }

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors }

  const optional = (value: string) => (value ? value : undefined)
  return {
    input: {
      transportadoraRazaoSocial: carrierName,
      transportadoraCnpj: carrierTaxId,
      transportadoraAntt: optional(text('transportadoraAntt')),
      veiculoDescricao: vehicleDescription,
      origemEndereco: optional(text('origemEndereco')),
      destinoEndereco: optional(text('destinoEndereco')),
      itens: items,
    },
  }
}

export async function issueManifestAction(
  stageId: number,
  _previousState: ManifestFormState,
  formData: FormData,
): Promise<ManifestFormState> {
  const t = await getTranslations('Manifest.validation')
  const parsed = parseManifestForm(formData, t)
  if (!parsed.input) return { status: 'error', fieldErrors: parsed.fieldErrors }

  let createdId: number
  try {
    createdId = (await issueManifest({ viagemEtapaId: stageId, ...parsed.input })).id
  } catch (error) {
    if (error instanceof UnauthorizedError) redirectToExpiredSession('/romaneios')
    if (error instanceof ApiRequestError) {
      return { status: 'error', message: error.message, fieldErrors: error.fieldErrors }
    }
    return { status: 'error', message: t('network') }
  }

  revalidatePath('/romaneios')
  revalidatePath('/viagens')
  return { status: 'success', createdId }
}

/** Corrige o conteúdo; número, data e autor continuam imutáveis no backend. */
export async function updateManifestAction(
  manifestId: number,
  stageId: number,
  _previousState: ManifestFormState,
  formData: FormData,
): Promise<ManifestFormState> {
  const t = await getTranslations('Manifest.validation')
  const parsed = parseManifestForm(formData, t)
  if (!parsed.input) return { status: 'error', fieldErrors: parsed.fieldErrors }

  try {
    await updateManifest(manifestId, { viagemEtapaId: stageId, ...parsed.input })
  } catch (error) {
    if (error instanceof UnauthorizedError) redirectToExpiredSession('/romaneios')
    if (error instanceof ApiRequestError) {
      return { status: 'error', message: error.message, fieldErrors: error.fieldErrors }
    }
    return { status: 'error', message: t('network') }
  }

  revalidatePath('/romaneios')
  return { status: 'success', createdId: manifestId }
}

type ManifestLoadState =
  | { status: 'success'; manifest: Manifest }
  | { status: 'error'; message: string }

/** Carrega o documento completo somente quando o modal é aberto. */
export async function loadManifestAction(id: number): Promise<ManifestLoadState> {
  const t = await getTranslations('Manifest.validation')
  try {
    return { status: 'success', manifest: await fetchManifest(id) }
  } catch (error) {
    if (error instanceof UnauthorizedError) redirectToExpiredSession('/romaneios')
    if (error instanceof ApiRequestError) return { status: 'error', message: error.message }
    return { status: 'error', message: t('loadFailed') }
  }
}
