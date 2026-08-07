import type { ReactNode } from 'react'
import { getSessionAvatarInitial } from '@/features/auth/api/session-avatar'
import { fetchOverdueMaintenances } from '@/features/maintenance/api/maintenance-api'
import { withOptionalSession } from '@/shared/api/require-session'
import { AppShell } from '@/widgets/app-shell/ui/app-shell'

export default async function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const [maintenanceAlerts, userInitial] = await Promise.all([
    withOptionalSession(
      '/',
      async () => {
        const page = await fetchOverdueMaintenances()
        return { items: page.items, total: page.totalItems, unavailable: false }
      },
      { items: [], total: 0, unavailable: true },
    ),
    getSessionAvatarInitial(),
  ])

  return <AppShell maintenanceAlerts={maintenanceAlerts} userInitial={userInitial}>{children}</AppShell>
}
