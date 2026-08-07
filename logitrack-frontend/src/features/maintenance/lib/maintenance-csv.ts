import type { MaintenanceOrder } from '../model/maintenance'
import { toCsv } from '@/shared/lib/export-serialization'

export type MaintenanceExportLabels = {
  columns: readonly string[]
  statuses: Record<MaintenanceOrder['status'], string>
  yes: string
  no: string
}

export function toMaintenanceCsv(orders: readonly MaintenanceOrder[], labels: MaintenanceExportLabels): string {
  return toCsv([
    labels.columns,
    ...orders.map((order) => [
      order.id,
      order.vehiclePlate,
      order.vehicleModel,
      order.services.map((service) => service.name).join(' | '),
      order.services.map((service) => service.cost.toFixed(2)).join(' | '),
      order.totalCost.toFixed(2),
      order.plannedStart,
      order.plannedFinish,
      order.startedAt,
      order.completedAt,
      labels.statuses[order.status],
      order.overdue ? labels.yes : labels.no,
    ]),
  ])
}
