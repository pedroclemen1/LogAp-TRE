'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/shared/ui/button'
import { Field } from '@/shared/ui/field'
import { TextInput } from '@/shared/ui/text-input'
import { useToast } from '@/shared/ui/use-toast'
import { saveDriverAction } from '../actions'
import type { Driver } from '../model/reference-data'

const CONTROL =
  'h-10 w-full rounded-xs border border-outline-variant bg-surface-container-lowest px-3 font-body-sm ' +
  'text-body-sm text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary'

export function DriverForm({ driver, onSuccess, onCancel }: {
  driver?: Driver
  onSuccess: () => void
  onCancel: () => void
}) {
  const t = useTranslations('Reference.drivers.form')
  const { showToast } = useToast()
  const [name, setName] = useState(driver?.name ?? '')
  const [license, setLicense] = useState(driver?.license ?? '')
  const [phone, setPhone] = useState(driver?.phone ?? '')
  const [message, setMessage] = useState<string>()
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>()
  const [isPending, startTransition] = useTransition()

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedLicense = license.replace(/\D/g, '')
    const localErrors: Record<string, string> = {}
    if (!name.trim()) localErrors.nome = t('nameRequired')
    if (normalizedLicense.length !== 11) localErrors.cnh = t('licenseInvalid')
    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors)
      return
    }
    setMessage(undefined)
    setFieldErrors(undefined)
    startTransition(async () => {
      const result = await saveDriverAction(driver?.id, { nome: name, cnh: normalizedLicense, telefone: phone })
      if (result.status === 'error') {
        setMessage(result.message)
        setFieldErrors(result.fieldErrors)
        if (result.message) showToast({ tone: 'error', title: t('saveFailed'), description: result.message })
      } else onSuccess()
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field htmlFor="driver-name" label={t('name')} error={fieldErrors?.nome}>
        <TextInput id="driver-name" required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className={CONTROL} />
      </Field>
      <Field htmlFor="driver-license" label={t('license')} error={fieldErrors?.cnh}>
        <TextInput
          id="driver-license"
          required
          inputMode="numeric"
          maxLength={11}
          autoComplete="off"
          placeholder="00000000000"
          value={license}
          onChange={(event) => setLicense(event.target.value)}
          className={`${CONTROL} font-data-mono`}
        />
      </Field>
      <Field htmlFor="driver-phone" label={t('phone')} error={fieldErrors?.telefone}>
        <TextInput id="driver-phone" type="tel" maxLength={20} value={phone} onChange={(event) => setPhone(event.target.value)} className={CONTROL} />
      </Field>
      {message && <p role="alert" className="rounded-xs bg-error-container px-3 py-2 text-body-sm text-on-error-container">{message}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <Button onClick={onCancel} disabled={isPending}>{t('cancel')}</Button>
        <Button type="submit" variant="primary" disabled={isPending}>{isPending ? t('saving') : t('save')}</Button>
      </div>
    </form>
  )
}
