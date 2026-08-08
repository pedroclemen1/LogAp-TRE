import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { getSessionUser } from '@/features/auth/api/session-user'
import { canManageMasterData } from '@/features/auth/model/authorization'
import { fetchDrivers } from '@/features/reference-data/api/drivers-api'
import { DriversScreen } from '@/features/reference-data/components/drivers-screen'
import { parseReferenceFilters, type ReferenceSearchParams } from '@/features/reference-data/model/reference-data'
import { withSession } from '@/shared/api/require-session'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata')
  return { title: t('drivers') }
}

export default async function Page({ searchParams }: { searchParams: Promise<ReferenceSearchParams> }) {
  const filters = parseReferenceFilters(await searchParams)
  const [drivers, sessionUser] = await Promise.all([
    withSession('/motoristas', () => fetchDrivers(filters)),
    getSessionUser(),
  ])

  return (
    <DriversScreen
      drivers={drivers}
      filters={filters}
      canManage={canManageMasterData(sessionUser?.role)}
    />
  )
}
