'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import type { MaintenanceOrder } from '@/features/maintenance/model/maintenance'
import { Icon } from '@/shared/ui/icon'
import { NAV_ITEMS } from '../config/navigation'
import { BrandIdentity } from './brand-identity'
import { MaintenanceAlerts } from './maintenance-alerts'
import { UserMenu } from './user-menu'

export function Header({ maintenanceAlerts, userInitial, isManager }: {
  maintenanceAlerts: {
    items: MaintenanceOrder[]
    total: number
    unavailable: boolean
  }
  userInitial: string
  isManager: boolean
}) {
  const pathname = usePathname()
  const t = useTranslations('Header')
  let copy: { title: string; subtitle: string } | undefined

  if (pathname === '/') copy = { title: t('overview.title'), subtitle: t('overview.subtitle') }
  else if (pathname.startsWith('/frota')) copy = { title: t('fleet.title'), subtitle: t('fleet.subtitle') }
  else if (pathname === '/viagens/nova') copy = { title: t('newTrip.title'), subtitle: t('newTrip.subtitle') }
  else if (/^\/viagens\/\d+$/.test(pathname)) {
    copy = { title: t('tripDetails.title'), subtitle: t('tripDetails.subtitle') }
  } else if (pathname === '/viagens') copy = { title: t('trips.title'), subtitle: t('trips.subtitle') }
  else if (pathname === '/romaneios') copy = { title: t('manifests.title'), subtitle: t('manifests.subtitle') }
  else if (pathname === '/motoristas') copy = { title: t('drivers.title'), subtitle: t('drivers.subtitle') }
  else if (pathname === '/servicos-manutencao') {
    copy = { title: t('maintenanceServices.title'), subtitle: t('maintenanceServices.subtitle') }
  } else if (pathname === '/manutencoes') {
    copy = { title: t('maintenance.title'), subtitle: t('maintenance.subtitle') }
  } else if (pathname === '/usuarios') {
    copy = { title: t('users.title'), subtitle: t('users.subtitle') }
  }

  return (
    <nav className="fixed left-0 right-0 top-0 z-40 flex h-shell-header-height items-center justify-between gap-3 border-b border-outline-variant bg-surface px-4 sm:px-6 lg:left-sidebar-width lg:pl-8">
      <div className="flex min-w-0 items-center gap-3">
        <details className="group relative shrink-0 lg:hidden">
          <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-xs border border-outline-variant text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface" aria-label={t('openNavigation')}>
            <Icon name="menu" />
          </summary>
          <div className="absolute left-0 top-12 z-50 max-h-[70vh] w-64 overflow-y-auto rounded-xs border border-outline-variant bg-sidebar p-2 text-on-sidebar shadow-lg">
            <div className="mb-2 border-b border-outline-variant/40 px-3 py-3">
              <BrandIdentity compact align="start" />
            </div>
            {NAV_ITEMS.map((item) => {
              const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-3 rounded-xs border-l-4 px-3 py-2 text-body-sm transition-colors ${
                    isActive
                      ? 'border-sidebar-accent bg-sidebar-active font-semibold text-on-sidebar'
                      : 'border-transparent text-on-sidebar-variant hover:border-sidebar-accent hover:bg-sidebar-hover hover:text-on-sidebar'
                  }`}
                >
                  <Icon name={item.icon} className="text-[19px]" /> {t(`navigation.${item.key}`)}
                </Link>
              )
            })}
          </div>
        </details>

        {copy ? (
          <div className="min-w-0">
            <h2 className="truncate font-title-md text-title-md text-on-surface sm:font-display-lg sm:text-display-lg">
              {copy.title}
            </h2>
            <p className="hidden truncate font-body-md text-body-md text-on-surface-variant sm:block">
              {copy.subtitle}
            </p>
          </div>
        ) : (
          <span className="font-title-md text-title-md text-on-surface lg:hidden">LogiTrack Pro</span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-3 sm:gap-6">
        <MaintenanceAlerts
          maintenances={maintenanceAlerts.items}
          total={maintenanceAlerts.total}
          unavailable={maintenanceAlerts.unavailable}
        />
        <UserMenu userInitial={userInitial} isManager={isManager} />
      </div>
    </nav>
  )
}
