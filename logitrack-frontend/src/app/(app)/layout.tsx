import type { ReactNode } from 'react'
import { avatarInitialFromEmail } from '@/features/auth/lib/avatar-initial'
import { getSessionUser } from '@/features/auth/api/session-user'
import { fetchOverdueMaintenances } from '@/features/maintenance/api/maintenance-api'
import { withOptionalSession } from '@/shared/api/require-session'
import { AppShell } from '@/widgets/app-shell/ui/app-shell'

export default async function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const [maintenanceAlerts, sessionUser] = await Promise.all([
    withOptionalSession(
      '/',
      async () => {
        const page = await fetchOverdueMaintenances()
        return { items: page.items, total: page.totalItems, unavailable: false }
      },
      { items: [], total: 0, unavailable: true },
    ),
    getSessionUser(),
  ])

  return (
    <AppShell
      maintenanceAlerts={maintenanceAlerts}
      userInitial={avatarInitialFromEmail(sessionUser?.email)}
      isManager={sessionUser?.role === 'GESTOR'}
    >
      {children}
    </AppShell>
  )
}
