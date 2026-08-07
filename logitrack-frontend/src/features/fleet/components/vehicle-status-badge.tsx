import { useTranslations } from 'next-intl'
import type { VehicleStatus } from '@/entities/vehicle/model/vehicle-status'
import { Badge } from '@/shared/ui/badge'

/**
 * NOTA DE DESIGN: estes hex vieram da paleta Google Material do Stitch e nao
 * tem token equivalente em globals.css. Preservados na camada de UI porque
 * trocar por `error-container`/`tertiary-fixed` mudaria a cor renderizada.
 * Ver pendencia "tres paletas de sucesso" no README.
 */
const TONE: Record<VehicleStatus, string> = {
  available: 'bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6]',
  in_use: 'bg-[#FEF7E0] text-[#B06000] border border-[#FEEFC3]',
  maintenance: 'bg-[#FCE8E6] text-[#C5221F] border border-[#FAD2CF]',
}

export function VehicleStatusBadge({ status }: { status: VehicleStatus }) {
  const t = useTranslations('Fleet.status')
  return <Badge className={`text-[10px] font-bold ${TONE[status]}`}>{t(status)}</Badge>
}
