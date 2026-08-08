'use client'

import Image from 'next/image'
import { useActionState } from 'react'
import { useTranslations } from 'next-intl'
import type { InvitationDetails } from '../api/invitation-api'
import { acceptInvitationAction, type AcceptInvitationFormState } from '../invitation-actions'
import { AuthLocaleSwitcher } from './auth-locale-switcher'
import { Button } from '@/shared/ui/button'
import { Field } from '@/shared/ui/field'
import { Icon } from '@/shared/ui/icon'
import { TextInput } from '@/shared/ui/text-input'

const INITIAL_STATE: AcceptInvitationFormState = {}
const INPUT_CLASS =
  'h-10 w-full rounded-xs border border-outline-variant bg-surface-container-lowest px-3 text-on-surface ' +
  'focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'

export function InvitationAcceptanceScreen({
  token,
  invitation,
}: {
  token: string
  invitation: InvitationDetails
}) {
  const t = useTranslations('Invitation')
  const [state, formAction, isSubmitting] = useActionState(acceptInvitationAction, INITIAL_STATE)

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-background px-4 py-16 text-on-background">
      <div className="pointer-events-none absolute inset-0 grid-pattern" />
      <AuthLocaleSwitcher />

      <section className="relative z-10 w-full max-w-[500px] overflow-hidden rounded-sm border border-outline-variant bg-surface-container-lowest shadow-xl">
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
              <Icon name="person_add" />
            </span>
            <h1 className="font-headline-md text-headline-md text-on-surface">{t('accept.title')}</h1>
            <p className="mt-2 font-body-sm text-body-sm text-on-surface-variant">
              {t('accept.description', { email: invitation.email })}
            </p>
          </div>

          <div className="mb-5 flex items-center justify-between rounded-xs bg-surface-container-low px-3 py-2 text-body-sm">
            <span className="text-on-surface-variant">{t('role')}</span>
            <span className="font-medium text-on-surface">{t(`roles.${invitation.role}`)}</span>
          </div>

          <form action={formAction} className="space-y-4">
            <input type="hidden" name="token" value={token} />
            <Field htmlFor="name" label={t('name')} error={state.fieldErrors?.name}>
              <TextInput
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                maxLength={100}
                required
                className={INPUT_CLASS}
              />
            </Field>
            <Field htmlFor="password" label={t('password')} error={state.fieldErrors?.password}>
              <TextInput
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={12}
                required
                aria-describedby="invitation-password-help"
                className={INPUT_CLASS}
              />
              <p id="invitation-password-help" className="mt-1 text-body-sm text-on-surface-variant">
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
              {isSubmitting ? t('accept.submitting') : t('accept.submit')}
            </Button>
          </form>
        </div>
      </section>
    </main>
  )
}
