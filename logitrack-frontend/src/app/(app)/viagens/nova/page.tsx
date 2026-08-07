import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { fetchDriverOptions, fetchVehicleOptions } from '@/features/trips/api/trips-api'
import { NewTripForm } from '@/features/trips/components/new-trip-form'
import { withSession } from '@/shared/api/require-session'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata')
  return { title: t('newTrip') }
}

export default async function Page() {
  const [vehicles, drivers] = await withSession('/viagens/nova', () => Promise.all([
    fetchVehicleOptions(),
    fetchDriverOptions(),
  ]))
  return <NewTripForm vehicles={vehicles} drivers={drivers} />
}
