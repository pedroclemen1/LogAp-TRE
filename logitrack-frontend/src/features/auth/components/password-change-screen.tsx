'use client'

import Image from 'next/image'
import { useActionState } from 'react'
import { useTranslations } from 'next-intl'
import { changePasswordAction, signOutAction, type PasswordChangeFormState } from '../actions'
import { AuthLocaleSwitcher } from './auth-locale-switcher'
import { Button } from '@/shared/ui/button'
import { Field } from '@/shared/ui/field'
import { Icon } from '@/shared/ui/icon'
import { TextInput } from '@/shared/ui/text-input'

const INITIAL_STATE: PasswordChangeFormState = {}
const INPUT_CLASS =
  'h-10 w-full rounded-xs border border-outline-variant bg-surface-container-lowest px-3 text-on-surface ' +
  'focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'

export function PasswordChangeScreen() {
  const t = useTranslations('PasswordChange')
  const [state, formAction, isSubmitting] = useActionState(changePasswordAction, INITIAL_STATE)

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-background px-4 py-16 text-on-background">
      <div className="pointer-events-none absolute inset-0 grid-pattern" />
      <AuthLocaleSwitcher />

      <section className="relative z-10 w-full max-w-[480px] overflow-hidden rounded-sm border border-outline-variant bg-surface-container-lowest shadow-xl">
        <div className="h-1 bg-primary" />
        <div className="p-6 sm:p-8">
          <Image
            src="/img/logo-logitrack.png"
            alt={t('logoAlt')}
            width={512}
            height={235}
            priority
            className="mx-auto mb-5 h-auto w-36 object-contain dark:brightness-0 dark:invert"
          />

          <div className="mb-6 text-center">
            <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
              <Icon name="lock_reset" />
            </span>
            <h1 className="font-headline-md text-headline-md text-on-surface">{t('title')}</h1>
            <p className="mt-2 font-body-sm text-body-sm text-on-surface-variant">{t('description')}</p>
          </div>

          <form action={formAction} className="space-y-4">
            <Field
              htmlFor="currentPassword"
              label={t('currentPassword')}
              error={state.fieldErrors?.currentPassword}
            >
              <TextInput
                id="currentPassword"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                className={INPUT_CLASS}
              />
            </Field>

            <Field htmlFor="newPassword" label={t('newPassword')} error={state.fieldErrors?.newPassword}>
              <TextInput
                id="newPassword"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                minLength={12}
                required
                aria-describedby="password-help"
                className={INPUT_CLASS}
              />
              <p id="password-help" className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
                {t('passwordHelp')}
              </p>
            </Field>

            <Field
              htmlFor="confirmation"
              label={t('confirmation')}
              error={state.fieldErrors?.confirmation}
            >
              <TextInput
                id="confirmation"
                name="confirmation"
                type="password"
                autoComplete="new-password"
                minLength={12}
                required
                className={INPUT_CLASS}
              />
            </Field>

            {state.error && (
              <p role="alert" className="rounded-xs border border-error/40 bg-error-container/40 px-3 py-2 text-body-sm text-error">
                {state.error}
              </p>
            )}

            <Button type="submit" variant="primary" size="lg" disabled={isSubmitting} className="w-full">
              {isSubmitting ? t('saving') : t('submit')}
            </Button>
          </form>

          <form action={signOutAction} className="mt-3 text-center">
            <Button type="submit" variant="ghost">{t('logout')}</Button>
          </form>
        </div>
      </section>
    </main>
  )
}
