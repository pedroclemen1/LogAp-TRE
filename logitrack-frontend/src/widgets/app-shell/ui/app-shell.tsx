import type { ReactNode } from 'react'
import type { MaintenanceOrder } from '@/features/maintenance/model/maintenance'
import { Header } from './header'
import { Sidebar } from './sidebar'

export function AppShell({
  children,
  maintenanceAlerts,
  userInitial,
}: {
  children: ReactNode
  maintenanceAlerts: {
    items: MaintenanceOrder[]
    total: number
    unavailable: boolean
  }
  userInitial: string
}) {
  return (
    <div className="bg-background text-on-background font-body-md text-body-md min-h-full">
      <Header maintenanceAlerts={maintenanceAlerts} userInitial={userInitial} />
      <Sidebar />
      <main className="ml-0 mt-shell-header-height min-h-[calc(100vh-var(--spacing-shell-header-height))] p-4 sm:p-container-padding lg:ml-sidebar-width">
        {children}
      </main>
    </div>
  )
}
