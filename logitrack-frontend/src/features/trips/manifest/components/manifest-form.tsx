'use client'

import { useTranslations } from 'next-intl'
import { useRef } from 'react'
import { toCsv, toSpreadsheetXml } from '@/shared/lib/export-serialization'
import { Alert } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { Icon } from '@/shared/ui/icon'
import { IconButton } from '@/shared/ui/icon-button'
import { useManifestFormController } from '../controllers/use-manifest-form-controller'
import type { Manifest, ManifestCandidate, ManifestStage } from '../model/manifest'
import { ManifestDocument } from './manifest-document'

const INPUT = 'w-full rounded-xs border border-[#c7c5d1] bg-white px-2 py-1 font-body-sm text-body-sm '
  + 'text-[#1b1b20] placeholder:text-[#767681] focus:border-[#2e3675] focus:outline-2 focus:outline-[#2e3675]'
const CELL = 'border-b border-[#e4e1e8] px-3 py-2 align-top'
const FIELD_ERROR = 'mt-1 block font-body-sm text-[11px] text-[#ba1a1a]'

/** Baixa um arquivo gerado no cliente, sem passar pelo servidor. */
function download(content: string, fileName: string, mimeType: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

export function ManifestForm({
  candidate,
  stage,
  existing,
  onSaved,
  onCancel,
}: {
  candidate: ManifestCandidate
  /** O trecho coberto por este documento. */
  stage: ManifestStage
  /** Presente = corrigindo um documento já emitido. */
  existing?: Manifest
  onSaved: (manifestId: number) => void
  onCancel: () => void
}) {
  const t = useTranslations('Manifest.form')
  const controller = useManifestFormController(stage.stageId, onSaved, existing)
  const fileInput = useRef<HTMLInputElement>(null)

  const templateHeader = [t('invoice'), t('recipient'), t('volumes'), t('weight')]
  const templateRows = [['NF-001248', 'Indústrias Alfa Ltda', 12, 450.5]]

  function textInput(
    name: string,
    placeholder: string,
    defaultValue?: string,
    required = false,
    extra?: Partial<React.ComponentProps<'input'>>,
  ) {
    const error = controller.fieldError(name)
    return (
      <>
        <input
          name={name}
          required={required}
          placeholder={placeholder}
          defaultValue={defaultValue}
          aria-invalid={error ? true : undefined}
          className={INPUT}
          {...extra}
        />
        {error && <span className={FIELD_ERROR}>{error}</span>}
      </>
    )
  }

  /**
   * Campo de digitos apenas. `inputMode` sozinho nao resolve: ele e dica de
   * teclado mobile, e no desktop letras entram normalmente. A limpeza no
   * `onInput` cobre digitacao, colagem e arraste, e ainda aceita um CNPJ
   * colado com pontuacao, descartando o que nao for digito.
   */
  function digitsInput(name: string, placeholder: string, maxLength: number,
                       defaultValue?: string, required = false) {
    return textInput(name, placeholder, defaultValue, required, {
      inputMode: 'numeric',
      maxLength,
      onInput: (event) => {
        const field = event.currentTarget
        const digits = field.value.replace(/\D/g, '').slice(0, maxLength)
        if (field.value !== digits) field.value = digits
      },
    })
  }

  return (
    <form action={controller.formAction} className="space-y-4">
      <input type="hidden" name="itensQuantidade" value={controller.items.length} />

      <ManifestDocument
        data={{
          number: existing?.number,
          issuedAt: existing?.issuedAt,
          authentication: existing?.authentication,
          stageLabel: t('stageLabel', { order: stage.order, total: candidate.stages.length }),
          driverName: candidate.driverName ?? t('noDriver'),
          driverLicense: candidate.driverLicense,
          vehiclePlate: candidate.vehiclePlate,
          // Do TRECHO, não da viagem: o documento cobre esta perna.
          originName: stage.origin,
          destinationName: stage.destination,
          distanceKm: stage.distanceKm,
          // Somados ao vivo enquanto se digita ou logo após importar.
          totalVolumes: controller.totals.volumes,
          totalWeightKg: controller.totals.weight,
        }}
        slots={{
          carrierName: textInput('transportadoraRazaoSocial', t('carrierNamePlaceholder'), existing?.carrierName, true),
          carrierTaxId: digitsInput('transportadoraCnpj', t('carrierTaxIdPlaceholder'), 14, existing?.carrierTaxId, true),
          carrierRegistry: textInput('transportadoraAntt', t('registryPlaceholder'), existing?.carrierRegistry),
          vehicleDescription: textInput('veiculoDescricao', t('vehicleDescriptionPlaceholder'), existing?.vehicleDescription, true),
          originAddress: textInput('origemEndereco', t('originAddressPlaceholder'), existing?.originAddress),
          destinationAddress: textInput('destinoEndereco', t('destinationAddressPlaceholder'), existing?.destinationAddress),
          itemRows: controller.items.map((item, index) => {
            const prefix = `itens[${index}]`
            return (
              <tr key={item.key}>
                <td className={`${CELL} font-data-mono text-data-mono text-[#767681]`}>
                  {String(index + 1).padStart(2, '0')}
                </td>
                <td className={CELL}>
                  <input
                    name={`${prefix}.notaFiscal`}
                    value={item.invoice}
                    onChange={(event) => controller.changeItem(item.key, 'invoice', event.target.value)}
                    placeholder={t('invoicePlaceholder')}
                    className={INPUT}
                  />
                  {controller.fieldError(`${prefix}.notaFiscal`) && (
                    <span className={FIELD_ERROR}>{controller.fieldError(`${prefix}.notaFiscal`)}</span>
                  )}
                </td>
                <td className={CELL}>
                  <input
                    name={`${prefix}.destinatario`}
                    value={item.recipient}
                    onChange={(event) => controller.changeItem(item.key, 'recipient', event.target.value)}
                    placeholder={t('recipientPlaceholder')}
                    className={INPUT}
                  />
                  {controller.fieldError(`${prefix}.destinatario`) && (
                    <span className={FIELD_ERROR}>{controller.fieldError(`${prefix}.destinatario`)}</span>
                  )}
                </td>
                <td className={CELL}>
                  <input
                    name={`${prefix}.volumes`}
                    type="number"
                    min={1}
                    step={1}
                    value={item.volumes}
                    onChange={(event) => controller.changeItem(item.key, 'volumes', event.target.value)}
                    placeholder="0"
                    className={`${INPUT} text-right`}
                  />
                  {controller.fieldError(`${prefix}.volumes`) && (
                    <span className={FIELD_ERROR}>{controller.fieldError(`${prefix}.volumes`)}</span>
                  )}
                </td>
                <td className={CELL}>
                  <input
                    name={`${prefix}.pesoKg`}
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.weightKg}
                    onChange={(event) => controller.changeItem(item.key, 'weightKg', event.target.value)}
                    placeholder="0.00"
                    className={`${INPUT} text-right`}
                  />
                  {controller.fieldError(`${prefix}.pesoKg`) && (
                    <span className={FIELD_ERROR}>{controller.fieldError(`${prefix}.pesoKg`)}</span>
                  )}
                </td>
                <td className={`${CELL} text-right`}>
                  <IconButton
                    aria-label={t('removeItemAria', { position: index + 1 })}
                    title={t('removeItem')}
                    icon="close"
                    iconClassName="text-[16px]"
                    className="h-7 w-7 text-[#ba1a1a]"
                    disabled={!controller.canRemoveItem}
                    onClick={() => controller.removeItem(item.key)}
                  />
                </td>
              </tr>
            )
          }),
          itemActions: (
            <div className="space-y-2 border-t border-[#e4e1e8] px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-body-sm text-[11px] text-[#767681]">{t('itemsHelp')}</p>
                <div className="flex flex-wrap items-center gap-2">
                  {/*
                    O input de arquivo fica escondido e é acionado pelo botão:
                    o controle nativo não aceita estilo e destoaria do documento.
                  */}
                  <input
                    ref={fileInput}
                    type="file"
                    accept=".csv,.xls,.xml,text/csv"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) void controller.importItems(file)
                      // Zera para permitir reimportar o MESMO arquivo depois de corrigi-lo.
                      event.target.value = ''
                    }}
                  />
                  <Button size="sm" onClick={() => fileInput.current?.click()}>
                    <Icon name="upload_file" className="text-[16px]" /> {t('import')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => download(
                      '﻿' + toCsv([templateHeader, ...templateRows]),
                      t('templateFileName') + '.csv',
                      'text/csv;charset=utf-8',
                    )}
                  >
                    <Icon name="download" className="text-[16px]" /> {t('templateCsv')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => download(
                      toSpreadsheetXml(templateHeader, templateRows, t('templateSheetName')),
                      t('templateFileName') + '.xls',
                      'application/vnd.ms-excel;charset=utf-8',
                    )}
                  >
                    <Icon name="download" className="text-[16px]" /> {t('templateXls')}
                  </Button>
                  <Button size="sm" variant="primary" onClick={controller.addItem}>
                    <Icon name="add" className="text-[16px]" /> {t('addItem')}
                  </Button>
                </div>
              </div>
              <p className="font-body-sm text-[10px] text-[#767681]">{t('importFormats')}</p>
              {controller.importError && (
                <p role="alert" className="rounded-xs bg-[#ffdad6] px-2 py-1 font-body-sm text-[11px] text-[#93000a]">
                  {controller.importError}
                </p>
              )}
            </div>
          ),
        }}
      />

      <div className="space-y-4">
        {controller.fieldError('itens') && <Alert tone="error">{controller.fieldError('itens')}</Alert>}
        {controller.errorMessage && <Alert tone="error">{controller.errorMessage}</Alert>}

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={controller.isSubmitting}>
            {t('cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={controller.isSubmitting}>
            <Icon name="description" className="text-[18px]" />
            {controller.isSubmitting
              ? t('issuing')
              : controller.isEditing ? t('saveChanges') : t('issue')}
          </Button>
        </div>
      </div>
    </form>
  )
}
