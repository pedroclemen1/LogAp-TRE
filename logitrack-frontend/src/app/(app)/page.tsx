import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { fetchDashboard, fetchDashboardVehicles } from '@/features/dashboard/api/dashboard-api'
import { DashboardScreen } from '@/features/dashboard/components/dashboard-screen'
import { parseDashboardFilters, type DashboardSearchParams } from '@/features/dashboard/model/dashboard-filters'
import { withSession } from '@/shared/api/require-session'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata')
  return { title: t('dashboard') }
}

export default async function Page({ searchParams }: { searchParams: Promise<DashboardSearchParams> }) {
  const filters = parseDashboardFilters(await searchParams)
  const [dashboard, vehicles] = await withSession('/', () => Promise.all([
    fetchDashboard(filters),
    fetchDashboardVehicles(),
  ]))
  return <DashboardScreen dashboard={dashboard} vehicles={vehicles} filters={filters} />
}
