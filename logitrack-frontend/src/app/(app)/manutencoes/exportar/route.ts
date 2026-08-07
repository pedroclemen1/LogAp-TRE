import type { NextRequest } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { fetchAllMaintenances } from '@/features/maintenance/api/maintenance-api'
import { toMaintenanceCsv } from '@/features/maintenance/lib/maintenance-csv'
import { toMaintenanceXls } from '@/features/maintenance/lib/maintenance-xls'
import { builtInMaintenanceServiceKey } from '@/features/maintenance/lib/maintenance-service-name'
import { parseMaintenanceFilters } from '@/features/maintenance/model/maintenance-filters'
import { UnauthorizedError } from '@/shared/api/api-error'
import { todayLocalDate } from '@/shared/lib/date-string'
import { datedExportFilename } from '@/shared/lib/export-serialization'

export async function GET(request: NextRequest) {
  const t = await getTranslations('Maintenance')
  const params = request.nextUrl.searchParams
  const format = params.get('formato') === 'xls' ? 'xls' : 'csv'
  const filters = parseMaintenanceFilters({
    busca: params.get('busca') ?? undefined,
    veiculo: params.get('veiculo') ?? undefined,
    status: params.get('status') ?? undefined,
    inicioDe: params.get('inicioDe') ?? undefined,
    inicioAte: params.get('inicioAte') ?? undefined,
    ordem: params.get('ordem') ?? undefined,
  })

  let orders
  try {
    orders = await fetchAllMaintenances(filters)
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return Response.redirect(new URL('/api/auth/expirar?from=%2Fmanutencoes', request.url), 307)
    }
    throw error
  }

  const today = todayLocalDate()
  const prefix = t('exportFile.filename')
  const columns = [
    'id', 'vehiclePlate', 'vehicleModel', 'services', 'serviceCosts', 'totalCost',
    'plannedStart', 'plannedFinish', 'startedAt', 'completedAt', 'status', 'overdue',
  ].map((key) => t(`exportFile.columns.${key}` as Parameters<typeof t>[0]))
  const labels = {
    columns,
    statuses: {
      pending: t('status.pending'),
      in_progress: t('status.in_progress'),
      completed: t('status.completed'),
    },
    yes: t('exportFile.yes'),
    no: t('exportFile.no'),
  }
  const localizedOrders = orders.map((order) => ({
    ...order,
    services: order.services.map((service) => {
      const key = builtInMaintenanceServiceKey(service.name)
      return { ...service, name: key ? t(`serviceNames.${key}`) : service.name }
    }),
  }))
  const filename = datedExportFilename(prefix, today, format)
  const content = format === 'xls'
    ? toMaintenanceXls(localizedOrders, labels, t('exportFile.sheetName'))
    : '\uFEFF' + toMaintenanceCsv(localizedOrders, labels)
  return new Response(content, {
    headers: {
      'Content-Type': format === 'xls' ? 'application/vnd.ms-excel; charset=utf-8' : 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
