import type { NextRequest } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { fetchAllFleetRaw } from '@/features/fleet/api/fleet-api'
import { toFleetCsv } from '@/features/fleet/lib/fleet-csv'
import { toFleetXls } from '@/features/fleet/lib/fleet-xls'
import { parseFleetFilters } from '@/features/fleet/model/fleet-filters'
import { UnauthorizedError } from '@/shared/api/api-error'
import { todayLocalDate } from '@/shared/lib/date-string'
import { datedExportFilename } from '@/shared/lib/export-serialization'

/* O download passa pelo BFF porque o JWT não é exposto ao navegador. */
export async function GET(request: NextRequest) {
  const t = await getTranslations('Fleet.exportFile')
  const params = request.nextUrl.searchParams
  const format = params.get('formato') === 'xls' ? 'xls' : 'csv'
  const filters = parseFleetFilters({
    busca: params.get('busca') ?? undefined,
    categoria: params.get('categoria') ?? undefined,
    status: params.get('status') ?? undefined,
  })

  let vehicles
  try {
    vehicles = await fetchAllFleetRaw(filters)
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return Response.redirect(new URL('/api/auth/expirar?from=%2Ffrota', request.url), 307)
    }
    throw error
  }

  const today = todayLocalDate()
  const columns = [
    t('columns.id'),
    t('columns.plate'),
    t('columns.model'),
    t('columns.category'),
    t('columns.year'),
    t('columns.initialMileage'),
    t('columns.odometer'),
    t('columns.status'),
    t('columns.lastTrip'),
    t('columns.nextMaintenance'),
    t('columns.overdueMaintenance'),
  ]
  const filename = datedExportFilename(t('filename'), today, format)
  const content = format === 'xls'
    ? toFleetXls(vehicles, columns, t('sheetName'))
    : '\uFEFF' + toFleetCsv(vehicles, columns)

  return new Response(content, {
    headers: {
      'Content-Type': format === 'xls'
        ? 'application/vnd.ms-excel; charset=utf-8'
        : 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
