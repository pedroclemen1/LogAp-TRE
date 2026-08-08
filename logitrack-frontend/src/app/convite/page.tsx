import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { ApiRequestError } from '@/shared/api/api-error'
import { validateInvitation } from '@/features/auth/api/invitation-api'
import { InvitationAcceptanceScreen } from '@/features/auth/components/invitation-acceptance-screen'
import { InvalidInvitationScreen } from '@/features/auth/components/invalid-invitation-screen'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata')
  return { title: t('invitation'), referrer: 'no-referrer' }
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const t = await getTranslations('Invitation')
  const token = String((await searchParams).token ?? '').trim()

  if (!token) return <InvalidInvitationScreen message={t('errors.invalid')} />

  try {
    const invitation = await validateInvitation(token)
    return <InvitationAcceptanceScreen token={token} invitation={invitation} />
  } catch (error) {
    if (error instanceof ApiRequestError) {
      if (error.code === 'INVITATION_INVALID_OR_EXPIRED') {
        return <InvalidInvitationScreen message={t('errors.invalid')} />
      }
    }
    return <InvalidInvitationScreen message={t('errors.invalid')} />
  }
}
