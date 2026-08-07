import { useTranslations } from 'next-intl'
import { Badge } from '@/shared/ui/badge'
import { Icon } from '@/shared/ui/icon'
import type { MaintenanceStatus } from '../model/maintenance'
import { SERVICE_STATUS_TONE } from './service-status-tone'

const ICON: Record<MaintenanceStatus, string> = {
  pending: 'schedule',
  in_progress: 'build',
  completed: 'check_circle',
}

export function ServiceStatusBadge({ status }: { status: MaintenanceStatus }) {
  const t = useTranslations('Maintenance.status')
  return (
    <Badge className={`text-[10px] font-bold ${SERVICE_STATUS_TONE[status]}`}>
      <Icon name={ICON[status]} className="text-[12px]" /> {t(status)}
    </Badge>
  )
}
