import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { fetchManifestCandidates } from '@/features/trips/manifest/api/manifest-api'
import { ManifestScreen } from '@/features/trips/manifest/components/manifest-screen'
import { fetchVehicleOptions } from '@/features/trips/api/trips-api'
import { STATUS_TO_DTO } from '@/features/trips/api/trip-mapper'
import {
  parseTripFilters,
  parseTripPageSize,
  type TripSearchParams,
} from '@/features/trips/model/trip-filters'
import { withSession } from '@/shared/api/require-session'
import { parsePageParam } from '@/shared/lib/page-param'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata')
  return { title: t('manifests') }
}

/**
 * Quem busca o dado e a page; a tela recebe por prop e e apresentacional.
 *
 * Os filtros sao os MESMOS da tela de Viagens (`parseTripFilters`) — a listagem
 * espelha aquela, entao reusar o parser evita duas gramaticas de URL para a
 * mesma coisa.
 *
 * Uma lista so: as viagens com seus trechos. O romaneio nao e navegavel por
 * fora; ele pertence a um trecho e se abre a partir dele.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<TripSearchParams>
}) {
  const params = await searchParams
  const filters = parseTripFilters(params)
  const size = parseTripPageSize(params.size)
  const page = parsePageParam(params.page)

  const [candidates, vehicles] = await withSession('/romaneios', () => Promise.all([
    fetchManifestCandidates({
      page,
      size,
      busca: filters.search || undefined,
      veiculoId: filters.vehicleId,
      status: filters.status ? STATUS_TO_DTO[filters.status] : undefined,
    }),
    fetchVehicleOptions(),
  ]))

  return <ManifestScreen candidates={candidates} filters={filters} size={size} vehicles={vehicles} />
}
