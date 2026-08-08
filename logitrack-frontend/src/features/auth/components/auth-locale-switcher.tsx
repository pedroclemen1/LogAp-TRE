'use client'

import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { useTransition } from 'react'
import { setLocaleAction } from '@/features/locale/actions'
import type { AppLocale } from '@/i18n/config'

const OPTIONS: readonly { locale: AppLocale; label: string }[] = [
  { locale: 'pt-BR', label: 'PT' },
  { locale: 'en-US', label: 'EN' },
]

export function AuthLocaleSwitcher() {
  const locale = useLocale()
  const t = useTranslations('UserMenu')
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function changeLocale(nextLocale: AppLocale) {
    if (nextLocale === locale) return
    startTransition(async () => {
      await setLocaleAction(nextLocale)
      router.refresh()
    })
  }

  return (
    <div
      role="group"
      aria-label={t('language')}
      className="absolute right-5 top-5 z-20 flex rounded-full border border-outline-variant bg-surface-container-lowest p-1 shadow-sm"
    >
      {OPTIONS.map((option) => {
        const selected = option.locale === locale
        return (
          <button
            key={option.locale}
            type="button"
            disabled={isPending}
            aria-pressed={selected}
            onClick={() => changeLocale(option.locale)}
            className={`rounded-full px-3 py-1 font-data-mono text-[11px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50 ${
              selected
                ? 'bg-primary text-on-primary'
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
