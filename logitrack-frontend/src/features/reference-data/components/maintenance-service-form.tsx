'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/shared/ui/button'
import { Field } from '@/shared/ui/field'
import { TextInput } from '@/shared/ui/text-input'
import { useToast } from '@/shared/ui/use-toast'
import { saveMaintenanceServiceAction } from '../actions'
import type { MaintenanceServiceItem } from '../model/reference-data'

const CONTROL =
  'h-10 w-full rounded-xs border border-outline-variant bg-surface-container-lowest px-3 font-body-sm ' +
  'text-body-sm text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary'

export function MaintenanceServiceForm({ service, onSuccess, onCancel }: {
  service?: MaintenanceServiceItem
  onSuccess: () => void
  onCancel: () => void
}) {
  const t = useTranslations('Reference.services.form')
  const { showToast } = useToast()
  const [name, setName] = useState(service?.name ?? '')
  const [message, setMessage] = useState<string>()
  const [fieldError, setFieldError] = useState<string>()
  const [isPending, startTransition] = useTransition()

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) {
      setFieldError(t('nameRequired'))
      return
    }
    setMessage(undefined)
    setFieldError(undefined)
    startTransition(async () => {
      const result = await saveMaintenanceServiceAction(service?.id, { nome: name })
      if (result.status === 'error') {
        setMessage(result.message)
        setFieldError(result.fieldErrors?.nome)
        if (result.message) showToast({ tone: 'error', title: t('saveFailed'), description: result.message })
      } else onSuccess()
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field htmlFor="service-name" label={t('name')} error={fieldError}>
        <TextInput
          id="service-name"
          required
          maxLength={100}
          placeholder={t('placeholder')}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={CONTROL}
        />
      </Field>
      <p className="font-body-sm text-body-sm text-on-surface-variant">
        {t('help')}
      </p>
      {message && <p role="alert" className="rounded-xs bg-error-container px-3 py-2 text-body-sm text-on-error-container">{message}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <Button onClick={onCancel} disabled={isPending}>{t('cancel')}</Button>
        <Button type="submit" variant="primary" disabled={isPending}>{isPending ? t('saving') : t('save')}</Button>
      </div>
    </form>
  )
}
