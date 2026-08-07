import { Badge } from '@/shared/ui/badge'
import type { TripStatus, VehicleKind } from '../model/trip'

/**
 * NOTA DE DESIGN: o verde de "Concluída" veio hard-coded do Stitch
 * (`#ecfdf5/#065f46/#a7f3d0`). Nao existe token de sucesso em globals.css,
 * entao os hex foram preservados aqui, na camada de UI, em vez de trocados
 * por um token aproximado — trocar mudaria a cor.
 */
const TONE: Record<TripStatus, string> = {
  in_progress: 'bg-secondary-container text-on-secondary-container',
  scheduled: 'bg-surface-container-highest text-on-surface-variant border border-outline-variant/30',
  completed: 'bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]',
  canceled: 'bg-error-container text-on-error-container border border-error/20',
}

export function TripStatusBadge({ status }: { status: TripStatus }) {
  const t = useTranslations('Trips.status')
  return (
    <Badge shape="pill" className={`text-[11px] font-bold ${TONE[status]}`}>
      {t(status)}
    </Badge>
  )
}

export function VehicleKindTag({ kind }: { kind: VehicleKind }) {
  const t = useTranslations('Trips.vehicleKind')
  return (
    <span className="px-1.5 py-0.5 bg-surface-container-highest rounded-xs text-[10px] font-bold text-on-surface-variant">
      {t(kind)}
    </span>
  )
}
import { useTranslations } from 'next-intl'
