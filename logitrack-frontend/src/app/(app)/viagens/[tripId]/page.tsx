import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { fetchDriverOptions, fetchTripDetails, fetchVehicleOptions } from '@/features/trips/api/trips-api'
import { TripDetailsScreen } from '@/features/trips/components/trip-details-screen'
import { NotFoundError } from '@/shared/api/api-error'
import { withSession } from '@/shared/api/require-session'
import { ToastOnMount } from '@/shared/ui/toast'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata')
  return { title: t('tripDetails') }
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>
  searchParams: Promise<{ created?: string | string[] }>
}) {
  const t = await getTranslations('Trips.created')
  const { tripId: rawTripId } = await params
  const { created } = await searchParams
  const tripId = Number(rawTripId)
  if (!Number.isInteger(tripId) || tripId <= 0) notFound()

  try {
    const [details, vehicles, drivers] = await withSession(`/viagens/${tripId}`, () => Promise.all([
      fetchTripDetails(tripId),
      fetchVehicleOptions(),
      fetchDriverOptions(),
    ]))
    return (
      <>
        {created === '1' && (
          <ToastOnMount
            clearPath={`/viagens/${tripId}`}
            toast={{ tone: 'success', title: t('title'), description: t('description', { id: tripId }) }}
          />
        )}
        <TripDetailsScreen details={details} vehicles={vehicles} drivers={drivers} />
      </>
    )
  } catch (error) {
    if (error instanceof NotFoundError) notFound()
    throw error
  }
}
