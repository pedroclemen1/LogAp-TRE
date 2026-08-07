'use client'

import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import type { ReactNode } from 'react'
import { formatDateTime, formatDecimal, formatInteger, formatKilometers } from '@/shared/lib/format'
import { SHEET_IGNORE_ATTR } from '@/shared/lib/sheet-pdf'
import { Icon } from '@/shared/ui/icon'
import type { AppLocale } from '@/i18n/config'

/** Layout imprimível compartilhado pelo formulário e pela leitura. */

type DocumentField = { label: string; value: ReactNode }

/** Fica de fora da captura: existe só para operar o formulário. */
const IGNORE = { [SHEET_IGNORE_ATTR]: '' }

const SHEET = 'bg-white text-[#1b1b20] shadow-sm'
const SECTION_TITLE = 'bg-[#f1f5f9] px-3 py-1.5 font-label-caps text-label-caps uppercase tracking-wider text-[#464650]'
const BOX = 'border border-[#c7c5d1]'
const FIELD_LABEL = 'font-label-caps text-[10px] uppercase tracking-wider text-[#767681]'
const FIELD_VALUE = 'font-body-sm text-body-sm font-medium text-[#1b1b20]'
const CELL = 'border-b border-[#e4e1e8] px-3 py-2'

function Field({ label, value }: DocumentField) {
  return (
    <div className="min-w-0">
      <p className={FIELD_LABEL}>{label}</p>
      <div className={`mt-0.5 ${FIELD_VALUE}`}>{value}</div>
    </div>
  )
}

type ManifestDocumentData = {
  number?: string
  /** Trecho coberto: "Trecho 02 de 03". */
  stageLabel?: string
  issuedAt?: string
  authentication?: string
  driverName: string
  driverLicense?: string
  vehiclePlate: string
  originName: string
  destinationName: string
  distanceKm: number
  totalVolumes: number
  totalWeightKg: number
}

type ManifestDocumentSlots = {
  carrierName: ReactNode
  carrierTaxId: ReactNode
  carrierRegistry: ReactNode
  vehicleDescription: ReactNode
  originAddress: ReactNode
  destinationAddress: ReactNode
  /** Linhas da tabela de carga: `<tr>` de leitura ou de edicao. */
  itemRows: ReactNode
  /** Barra de acoes abaixo da tabela (ex.: "adicionar item"); ausente na leitura. */
  itemActions?: ReactNode
}

export function ManifestDocument({
  data,
  slots,
}: {
  data: ManifestDocumentData
  slots: ManifestDocumentSlots
}) {
  const t = useTranslations('Manifest.document')
  const locale = useLocale() as AppLocale

  return (
    <div data-manifest-sheet className={`${SHEET} mx-auto max-w-[960px] rounded-sm p-6 lg:p-8`}>
      <header className="mb-6 flex flex-col justify-between gap-4 border-b border-[#c7c5d1] pb-4 sm:flex-row sm:items-start">
        <div>
          <Image
            src="/img/logo-logap-wordmark.png"
            alt="LogAp"
            width={365}
            height={128}
            sizes="128px"
            priority
            className="h-auto w-32"
          />
          <h3 className="mt-2 font-headline-md text-headline-md font-bold uppercase tracking-wide text-[#171f5e]">
            {t('title')}
          </h3>
          {data.stageLabel && (
            <p className="mt-1 font-label-caps text-label-caps uppercase tracking-wider text-[#767681]">
              {data.stageLabel}
            </p>
          )}
        </div>
        <div className="text-left sm:text-right">
          <p className={FIELD_LABEL}>{t('documentNumber')}</p>
          <p className="font-data-mono text-headline-sm font-bold text-[#171f5e]">
            {data.number ?? t('numberOnIssue')}
          </p>
          <p className={`mt-2 ${FIELD_LABEL}`}>{t('issuedAt')}</p>
          <p className="font-data-mono text-data-mono text-[#464650]">
            {data.issuedAt ? formatDateTime(data.issuedAt, locale) : t('dateOnIssue')}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className={`${BOX} rounded-xs`}>
          <h4 className={SECTION_TITLE}>{t('carrier')}</h4>
          <div className="space-y-3 p-3">
            <Field label={t('legalName')} value={slots.carrierName} />
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('taxId')} value={slots.carrierTaxId} />
              <Field label={t('registry')} value={slots.carrierRegistry} />
            </div>
          </div>
        </section>

        <section className={`${BOX} rounded-xs`}>
          <h4 className={SECTION_TITLE}>{t('vehicleAndDriver')}</h4>
          <div className="space-y-3 p-3">
            <Field label={t('driver')} value={data.driverName} />
            <Field
              label={t('license')}
              value={<span className="font-data-mono text-data-mono">{data.driverLicense ?? '—'}</span>}
            />
            <div className="grid grid-cols-2 gap-3">
              <Field
                label={t('plate')}
                value={<span className="font-data-mono text-data-mono font-bold">{data.vehiclePlate}</span>}
              />
              <Field label={t('vehicleType')} value={slots.vehicleDescription} />
            </div>
          </div>
        </section>
      </div>

      <section className={`${BOX} mt-4 rounded-xs`}>
        <h4 className={SECTION_TITLE}>{t('route')}</h4>
        <div className="grid grid-cols-1 items-start gap-4 p-3 md:grid-cols-[1fr_auto_1fr]">
          <div>
            <Field label={t('origin')} value={<span className="font-bold">{data.originName}</span>} />
            <div className="mt-2">{slots.originAddress}</div>
          </div>
          <div className="flex items-center gap-2 self-center rounded-xs bg-[#f1f5f9] px-3 py-1.5">
            <Icon name="route" className="text-[16px] text-[#2e3675]" />
            <span className="font-data-mono text-data-mono font-bold text-[#171f5e]">
              {formatKilometers(data.distanceKm, locale)}
            </span>
          </div>
          <div>
            <Field label={t('destination')} value={<span className="font-bold">{data.destinationName}</span>} />
            <div className="mt-2">{slots.destinationAddress}</div>
          </div>
        </div>
      </section>

      <section className={`${BOX} mt-4 rounded-xs`}>
        <h4 className={SECTION_TITLE}>{t('cargoItems')}</h4>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="bg-[#f8fafc] text-left">
                <th className={`${CELL} w-14 ${FIELD_LABEL}`}>{t('sequence')}</th>
                <th className={`${CELL} ${FIELD_LABEL}`}>{t('invoice')}</th>
                <th className={`${CELL} ${FIELD_LABEL}`}>{t('recipient')}</th>
                <th className={`${CELL} w-28 text-right ${FIELD_LABEL}`}>{t('volumes')}</th>
                <th className={`${CELL} w-32 text-right ${FIELD_LABEL}`}>{t('weight')}</th>
                {slots.itemActions && <th {...IGNORE} className={`${CELL} w-12`} aria-label={t('actions')} />}
              </tr>
            </thead>
            <tbody>{slots.itemRows}</tbody>
            <tfoot>
              <tr className="bg-[#f1f5f9] font-bold">
                <td className="px-3 py-2" colSpan={3}>
                  <span className={FIELD_LABEL}>{t('totals')}</span>
                </td>
                <td className="px-3 py-2 text-right font-data-mono text-data-mono">
                  {formatInteger(data.totalVolumes, locale)}
                </td>
                <td className="px-3 py-2 text-right font-data-mono text-data-mono">
                  {formatDecimal(data.totalWeightKg, locale)} kg
                </td>
                {slots.itemActions && <td {...IGNORE} />}
              </tr>
            </tfoot>
          </table>
        </div>
        <div {...IGNORE}>{slots.itemActions}</div>
      </section>

      <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2">
        <div className="border-t border-[#767681] pt-2 text-center">
          <p className="font-body-sm text-body-sm font-medium">{t('driverSignature')}</p>
          <p className="mt-0.5 text-[10px] text-[#767681]">{t('driverSignatureNote')}</p>
        </div>
        <div className="border-t border-[#767681] pt-2 text-center">
          <p className="font-body-sm text-body-sm font-medium">{t('checkerSignature')}</p>
          <p className="mt-0.5 text-[10px] text-[#767681]">{t('releaseDate')}</p>
        </div>
      </div>

      <footer className="mt-6 flex items-center justify-center gap-1.5 border-t border-[#e4e1e8] pt-3 text-[10px] uppercase tracking-wider text-[#767681]">
        <Icon name="shield" className="text-[12px]" />
        {data.authentication
          ? t('footerIssued', { code: data.authentication })
          : t('footerPending')}
      </footer>
    </div>
  )
}
