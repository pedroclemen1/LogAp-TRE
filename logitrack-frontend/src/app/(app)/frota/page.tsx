import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { fetchFleet } from '@/features/fleet/api/fleet-api'
import { FleetScreen } from '@/features/fleet/components/fleet-screen'
import { parseFleetFilters, type FleetSearchParams } from '@/features/fleet/model/fleet-filters'
import { withSession } from '@/shared/api/require-session'
import { parsePageParam } from '@/shared/lib/page-param'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata')
  return { title: t('fleet') }
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<FleetSearchParams>
}) {
  const params = await searchParams
  const filters = parseFleetFilters(params)

  const fleet = await withSession('/frota', () => fetchFleet(parsePageParam(params.page), filters))

  return <FleetScreen fleet={fleet} filters={filters} />
}
