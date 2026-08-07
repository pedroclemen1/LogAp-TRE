'use client'

import { useLocale, useTranslations } from 'next-intl'
import { formatDecimal, formatInteger } from '@/shared/lib/format'
import type { AppLocale } from '@/i18n/config'
import type { Manifest } from '../model/manifest'
import { ManifestDocument } from './manifest-document'

const CELL = 'border-b border-[#e4e1e8] px-3 py-2'
const VALUE = 'font-body-sm text-body-sm font-medium text-[#1b1b20]'
const MUTED = 'font-body-sm text-body-sm text-[#767681]'

export function ManifestView({ manifest }: { manifest: Manifest }) {
  const t = useTranslations('Manifest.document')
  const locale = useLocale() as AppLocale

  const orDash = (value?: string) =>
    value ? <span className={VALUE}>{value}</span> : <span className={MUTED}>—</span>

  return (
    <ManifestDocument
      data={{
        number: manifest.number,
        stageLabel: t('stageOf', { order: manifest.stageOrder }),
        issuedAt: manifest.issuedAt,
        authentication: manifest.authentication,
        driverName: manifest.driverName,
        driverLicense: manifest.driverLicense,
        vehiclePlate: manifest.vehiclePlate,
        originName: manifest.originName,
        destinationName: manifest.destinationName,
        distanceKm: manifest.distanceKm,
        totalVolumes: manifest.totalVolumes,
        totalWeightKg: manifest.totalWeightKg,
      }}
      slots={{
        carrierName: orDash(manifest.carrierName),
        carrierTaxId: <span className="font-data-mono text-data-mono">{manifest.carrierTaxId}</span>,
        carrierRegistry: orDash(manifest.carrierRegistry),
        vehicleDescription: orDash(manifest.vehicleDescription),
        originAddress: <p className={MUTED}>{manifest.originAddress ?? '—'}</p>,
        destinationAddress: <p className={MUTED}>{manifest.destinationAddress ?? '—'}</p>,
        itemRows: manifest.items.map((item) => (
          <tr key={item.id}>
            <td className={`${CELL} font-data-mono text-data-mono text-[#767681]`}>
              {String(item.sequence ?? 0).padStart(2, '0')}
            </td>
            <td className={`${CELL} font-data-mono text-data-mono`}>{item.invoice}</td>
            <td className={`${CELL} ${VALUE}`}>{item.recipient}</td>
            <td className={`${CELL} text-right font-data-mono text-data-mono`}>
              {formatInteger(item.volumes, locale)}
            </td>
            <td className={`${CELL} text-right font-data-mono text-data-mono`}>
              {formatDecimal(item.weightKg, locale)}
            </td>
          </tr>
        )),
      }}
    />
  )
}

/** Rodapé com a autoria da emissão; fica fora da folha para não ir para a impressão. */
export function ManifestIssuedBy({ manifest }: { manifest: Manifest }) {
  const t = useTranslations('Manifest.document')
  return (
    <p className="mt-3 text-center font-body-sm text-[11px] text-on-surface-variant">
      {t('issuedBy', { author: manifest.issuedBy })}
    </p>
  )
}
