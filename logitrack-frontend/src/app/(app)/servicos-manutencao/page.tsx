import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { fetchMaintenanceServices } from '@/features/reference-data/api/maintenance-services-api'
import { MaintenanceServicesScreen } from '@/features/reference-data/components/maintenance-services-screen'
import { parseReferenceFilters, type ReferenceSearchParams } from '@/features/reference-data/model/reference-data'
import { withSession } from '@/shared/api/require-session'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata')
  return { title: t('maintenanceServices') }
}

export default async function Page({ searchParams }: { searchParams: Promise<ReferenceSearchParams> }) {
  const filters = parseReferenceFilters(await searchParams)
  const services = await withSession('/servicos-manutencao', () => fetchMaintenanceServices(filters))
  return <MaintenanceServicesScreen services={services} filters={filters} />
}
