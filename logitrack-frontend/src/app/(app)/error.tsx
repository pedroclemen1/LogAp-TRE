'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/shared/ui/button'
import { Icon } from '@/shared/ui/icon'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('AppError')

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-80 items-center justify-center">
      <div className="max-w-lg rounded-sm border border-outline-variant bg-surface p-8 text-center shadow-sm">
        <Icon name="cloud_off" className="mb-3 text-[40px] text-error" />
        <h2 className="font-headline-sm text-headline-sm text-on-surface">{t('title')}</h2>
        <p className="mt-2 font-body-sm text-body-sm text-on-surface-variant">{t('description')}</p>
        <Button variant="primary" className="mt-5" onClick={reset}>
          <Icon name="refresh" className="text-[18px]" /> {t('tryAgain')}
        </Button>
      </div>
    </div>
  )
}
