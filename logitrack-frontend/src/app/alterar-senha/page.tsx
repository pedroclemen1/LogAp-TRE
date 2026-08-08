import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { PasswordChangeScreen } from '@/features/auth/components/password-change-screen'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata')
  return { title: t('passwordChange') }
}

export default function Page() {
  return <PasswordChangeScreen />
}
