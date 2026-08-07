'use client'

import { useCallback, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/shared/ui/button'
import { Icon } from '@/shared/ui/icon'
import { Modal } from '@/shared/ui/modal'
import { useToast } from '@/shared/ui/use-toast'
import { VehicleForm } from './vehicle-form'

/**
 * Botao "ADD VEHICLE" e o dialogo que ele abre.
 *
 * O formulario so e montado enquanto o dialogo esta aberto, e a `key` muda a
 * cada abertura. Isso zera o `useActionState` de proposito: sem o remount, o
 * estado de sucesso do cadastro anterior sobreviveria e a proxima abertura ja
 * comecaria fechando sozinha.
 */
export function AddVehicleDialog() {
  const t = useTranslations('Fleet.addDialog')
  const { showToast } = useToast()
  const [open, setOpen] = useState(false)
  const [attempt, setAttempt] = useState(0)

  const close = useCallback(() => setOpen(false), [])

  const openDialog = useCallback(() => {
    setAttempt((previous) => previous + 1)
    setOpen(true)
  }, [])

  const handleCreated = useCallback(() => {
    close()
    showToast({ tone: 'success', title: t('successTitle'), description: t('successDescription') })
  }, [close, showToast, t])

  return (
    <>
      <Button
        variant="primary"
        onClick={openDialog}
        className="h-10 w-full px-6 border border-primary font-label-caps text-label-caps sm:w-auto"
      >
        <Icon name="add" className="text-[16px]" />
        {t('button')}
      </Button>

      <Modal
        open={open}
        onClose={close}
        title={t('title')}
        description={t('description')}
      >
        {open && <VehicleForm key={attempt} onSuccess={handleCreated} onCancel={close} />}
      </Modal>
    </>
  )
}
