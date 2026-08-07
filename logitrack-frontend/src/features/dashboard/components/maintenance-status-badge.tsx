import { useTranslations } from 'next-intl'
import { Badge } from '@/shared/ui/badge'
import type { DashboardMaintenanceStatus } from '../model/dashboard'

const TONE: Record<DashboardMaintenanceStatus, string> = {
  pending: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
  in_progress: 'bg-primary-fixed text-on-primary-fixed-variant',
  completed: 'bg-surface-container-highest text-on-surface-variant',
}

export function DashboardMaintenanceStatusBadge({ status }: { status: DashboardMaintenanceStatus }) {
  const t = useTranslations('Dashboard.maintenanceStatus')
  return <Badge className={`text-[10px] font-bold ${TONE[status]}`}>{t(status)}</Badge>
}
