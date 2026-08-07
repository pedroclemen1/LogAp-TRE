import { useTranslations } from 'next-intl'
import type { VehicleStatus } from '@/entities/vehicle/model/vehicle-status'
import type { FleetStatusCount } from '../model/dashboard'

const TEXT_TONE: Record<VehicleStatus, string> = {
  in_use: 'text-secondary-fixed',
  available: 'text-primary-container',
  maintenance: 'text-error',
}

const DOT_TONE: Record<VehicleStatus, string> = {
  in_use: 'bg-secondary-fixed',
  available: 'bg-primary-container',
  maintenance: 'bg-error',
}

export function FleetStatusSummary({ items }: { items: readonly FleetStatusCount[] }) {
  const t = useTranslations('Dashboard.fleetStatus')
  return (
    <div className="mt-6 pt-4 border-t border-outline-variant/30 flex justify-around">
      {items.map((item) => (
        <div key={item.status} className="text-center">
          <div className={`font-data-mono text-headline-sm ${TEXT_TONE[item.status]}`}>{item.count}</div>
          <div className="font-label-caps text-label-caps text-on-surface-variant flex items-center gap-1 justify-center mt-1">
            <span className={`w-2 h-2 rounded-full ${DOT_TONE[item.status]}`} /> {t(item.status)}
          </div>
        </div>
      ))}
    </div>
  )
}
