'use client'

import { useActionState, useState } from 'react'
import { useFormatter, useTranslations } from 'next-intl'
import { createInvitationAction, type CreateInvitationFormState } from '../invitation-actions'
import { Button } from '@/shared/ui/button'
import { Field } from '@/shared/ui/field'
import { Icon } from '@/shared/ui/icon'
import { Select } from '@/shared/ui/select'
import { Surface } from '@/shared/ui/surface'
import { TextInput } from '@/shared/ui/text-input'

const INITIAL_STATE: CreateInvitationFormState = {}
const INPUT_CLASS =
  'h-10 w-full rounded-xs border border-outline-variant bg-surface-container-lowest px-3 text-on-surface ' +
  'focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'

export function InvitationManagementScreen() {
  const t = useTranslations('Invitation')
  const format = useFormatter()
  const [state, formAction, isSubmitting] = useActionState(createInvitationAction, INITIAL_STATE)
  const [copied, setCopied] = useState(false)
  const invitation = state.invitation

  async function copyActivationUrl() {
    if (!invitation) return
    try {
      await navigator.clipboard.writeText(invitation.activationUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Surface className="p-5 sm:p-6">
        <div className="mb-6 flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
            <Icon name="person_add" />
          </span>
          <div>
            <h1 className="font-headline-sm text-headline-sm text-on-surface">{t('management.formTitle')}</h1>
            <p className="mt-1 text-body-sm text-on-surface-variant">{t('management.formDescription')}</p>
          </div>
        </div>

        <form action={formAction} className="space-y-4">
          <Field htmlFor="invitation-email" label={t('email')} error={state.fieldErrors?.email}>
            <TextInput
              id="invitation-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className={INPUT_CLASS}
            />
          </Field>

          <Field htmlFor="invitation-role" label={t('role')} error={state.fieldErrors?.role}>
            <Select
              id="invitation-role"
              name="role"
              defaultValue="OPERADOR"
              options={[
                { value: 'OPERADOR', label: t('roles.OPERADOR') },
                { value: 'GESTOR', label: t('roles.GESTOR') },
              ]}
              className="h-10 w-full bg-surface-container-lowest text-on-surface"
            />
          </Field>

          {state.error && (
            <p role="alert" className="rounded-xs border border-error/40 bg-error-container/40 px-3 py-2 text-body-sm text-error">
              {state.error}
            </p>
          )}

          <Button type="submit" variant="primary" size="lg" disabled={isSubmitting} className="w-full sm:w-auto">
            <Icon name="send" className="text-[18px]" />
            {isSubmitting ? t('management.generating') : t('management.generate')}
          </Button>
        </form>
      </Surface>

      <Surface className="p-5 sm:p-6">
        <div className="mb-5">
          <h2 className="font-headline-sm text-headline-sm text-on-surface">{t('management.resultTitle')}</h2>
          <p className="mt-1 text-body-sm text-on-surface-variant">{t('management.resultDescription')}</p>
        </div>

        {invitation ? (
          <div className="space-y-4">
            <dl className="grid gap-3 rounded-xs bg-surface-container-low p-4 text-body-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-on-surface-variant">{t('email')}</dt>
                <dd className="break-all text-right font-medium text-on-surface">{invitation.email}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-on-surface-variant">{t('role')}</dt>
                <dd className="font-medium text-on-surface">{t(`roles.${invitation.role}`)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-on-surface-variant">{t('expiresAt')}</dt>
                <dd className="text-right font-medium text-on-surface">
                  {format.dateTime(new Date(invitation.expiresAt), {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </dd>
              </div>
            </dl>

            <Field htmlFor="activation-url" label={t('management.activationLink')}>
              <div className="flex flex-col gap-2 sm:flex-row">
                <TextInput
                  id="activation-url"
                  type="text"
                  readOnly
                  value={invitation.activationUrl}
                  className={`${INPUT_CLASS} min-w-0 flex-1 font-data-mono text-data-mono`}
                  onFocus={(event) => event.currentTarget.select()}
                />
                <Button type="button" variant="secondary" size="lg" onClick={copyActivationUrl}>
                  <Icon name={copied ? 'check' : 'content_copy'} className="text-[18px]" />
                  {copied ? t('management.copied') : t('management.copy')}
                </Button>
              </div>
            </Field>
          </div>
        ) : (
          <div className="flex min-h-52 flex-col items-center justify-center rounded-xs border border-dashed border-outline-variant p-6 text-center text-on-surface-variant">
            <Icon name="link" className="mb-2 text-[32px]" />
            <p className="text-body-sm">{t('management.empty')}</p>
          </div>
        )}
      </Surface>
    </div>
  )
}
