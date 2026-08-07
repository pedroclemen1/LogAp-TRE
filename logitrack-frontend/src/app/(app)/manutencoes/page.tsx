import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import {
  fetchMaintenanceCatalog,
  fetchMaintenances,
  fetchMaintenanceSummary,
  fetchMaintenanceVehicles,
} from '@/features/maintenance/api/maintenance-api'
import { MaintenanceScreen } from '@/features/maintenance/components/maintenance-screen'
import { parseMaintenanceFilters, type MaintenanceSearchParams } from '@/features/maintenance/model/maintenance-filters'
import { withSession } from '@/shared/api/require-session'
import { parsePageParam } from '@/shared/lib/page-param'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata')
  return { title: t('maintenance') }
}

export default async function Page({ searchParams }: { searchParams: Promise<MaintenanceSearchParams> }) {
  const params = await searchParams
  const filters = parseMaintenanceFilters(params)
  const [maintenances, summary, vehicles, catalog] = await withSession('/manutencoes', () => Promise.all([
    fetchMaintenances(parsePageParam(params.page), filters),
    fetchMaintenanceSummary(),
    fetchMaintenanceVehicles(),
    fetchMaintenanceCatalog(),
  ]))
  return <MaintenanceScreen maintenances={maintenances} summary={summary} filters={filters} vehicles={vehicles} catalog={catalog} />
}
