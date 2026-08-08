import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getSessionUser } from '@/features/auth/api/session-user'
import { InvitationManagementScreen } from '@/features/auth/components/invitation-management-screen'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata')
  return { title: t('users') }
}

export default async function Page() {
  const user = await getSessionUser()
  if (user?.role !== 'GESTOR') redirect('/')

  return <InvitationManagementScreen />
}
