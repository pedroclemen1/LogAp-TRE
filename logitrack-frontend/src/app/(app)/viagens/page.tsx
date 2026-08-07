import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { fetchDriverOptions, fetchTrips, fetchVehicleOptions } from '@/features/trips/api/trips-api'
import { TripsScreen } from '@/features/trips/components/trips-screen'
import {
  parseTripFilters,
  parseTripPageSize,
  type TripSearchParams,
} from '@/features/trips/model/trip-filters'
import { withSession } from '@/shared/api/require-session'
import { parsePageParam } from '@/shared/lib/page-param'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata')
  return { title: t('trips') }
}

export default async function Page({ searchParams }: { searchParams: Promise<TripSearchParams> }) {
  const params = await searchParams
  const filters = parseTripFilters(params)
  const size = parseTripPageSize(params.size)
  const [trips, vehicles, drivers] = await withSession('/viagens', () => Promise.all([
    fetchTrips(parsePageParam(params.page), size, filters),
    fetchVehicleOptions(),
    fetchDriverOptions(),
  ]))

  return <TripsScreen trips={trips} filters={filters} size={size} vehicles={vehicles} drivers={drivers} />
}
