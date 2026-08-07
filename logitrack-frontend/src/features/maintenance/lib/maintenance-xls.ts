import { toSpreadsheetXml } from '@/shared/lib/export-serialization'
import type { MaintenanceOrder } from '../model/maintenance'
import type { MaintenanceExportLabels } from './maintenance-csv'

export function toMaintenanceXls(
  orders: readonly MaintenanceOrder[],
  labels: MaintenanceExportLabels,
  sheetName: string,
): string {
  return toSpreadsheetXml(
    labels.columns,
    orders.map((order) => [
      order.id,
      order.vehiclePlate,
      order.vehicleModel,
      order.services.map((service) => service.name).join(' | '),
      order.services.map((service) => service.cost.toFixed(2)).join(' | '),
      order.totalCost,
      order.plannedStart,
      order.plannedFinish,
      order.startedAt,
      order.completedAt,
      labels.statuses[order.status],
      order.overdue ? labels.yes : labels.no,
    ]),
    sheetName,
  )
}
