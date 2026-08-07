import { useTranslations } from 'next-intl'
import { Badge } from '@/shared/ui/badge'

export function RecordStatusBadge({ active }: { active: boolean }) {
  const t = useTranslations('Reference.common')
  return (
    <Badge className={`text-[10px] font-bold uppercase ${active
      ? 'border border-[#CEEAD6] bg-[#E6F4EA] text-[#137333]'
      : 'border border-[#FAD2CF] bg-[#FCE8E6] text-[#C5221F]'}`}>
      {active ? t('active') : t('inactive')}
    </Badge>
  )
}

export function DriverStatusBadge({ active, inUse }: { active: boolean; inUse: boolean }) {
  const t = useTranslations('Reference.common')
  const tone = !active
    ? 'border border-[#FAD2CF] bg-[#FCE8E6] text-[#C5221F]'
    : inUse
      ? 'border border-[#FEEFC3] bg-[#FEF7E0] text-[#B06000]'
      : 'border border-[#CEEAD6] bg-[#E6F4EA] text-[#137333]'

  return (
    <Badge className={`text-[10px] font-bold uppercase ${tone}`}>
      {!active ? t('inactive') : inUse ? t('inUse') : t('available')}
    </Badge>
  )
}
