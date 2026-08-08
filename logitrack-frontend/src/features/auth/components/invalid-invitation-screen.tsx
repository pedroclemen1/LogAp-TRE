import Image from 'next/image'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { AuthLocaleSwitcher } from './auth-locale-switcher'
import { buttonClassName } from '@/shared/ui/button-variants'
import { Icon } from '@/shared/ui/icon'

export async function InvalidInvitationScreen({ message }: { message: string }) {
  const t = await getTranslations('Invitation')

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-background px-4 py-16 text-on-background">
      <div className="pointer-events-none absolute inset-0 grid-pattern" />
      <AuthLocaleSwitcher />
      <section className="relative z-10 w-full max-w-[460px] overflow-hidden rounded-sm border border-outline-variant bg-surface-container-lowest text-center shadow-xl">
        <div className="h-1 bg-error" />
        <div className="p-8">
          <Image
            src="/img/logo-logitrack.png"
            alt={t('logoAlt')}
            width={512}
            height={235}
            priority
            className="mx-auto mb-6 h-auto w-36 object-contain dark:brightness-0 dark:invert"
          />
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-error-container text-on-error-container">
            <Icon name="link_off" />
          </span>
          <h1 className="font-headline-md text-headline-md text-on-surface">{t('invalid.title')}</h1>
          <p className="mt-3 text-body-sm text-on-surface-variant">{message}</p>
          <Link href="/login" className={buttonClassName('primary', 'lg', 'mt-6 w-full')}>
            {t('invalid.backToLogin')}
          </Link>
        </div>
      </section>
    </main>
  )
}
