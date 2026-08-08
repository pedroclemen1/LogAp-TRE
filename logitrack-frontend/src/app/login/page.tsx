import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { LoginScreen } from '@/features/auth/components/login-screen'
import { sanitizeInternalPath } from '@/features/auth/lib/internal-path'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata')
  return { title: t('login') }
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; expirada?: string; convite?: string }>
}) {
  const params = await searchParams

  return (
    <LoginScreen
      redirectTo={sanitizeInternalPath(params.from)}
      hasExpired={params.expirada === '1'}
      invitationAccepted={params.convite === 'aceito'}
    />
  )
}
