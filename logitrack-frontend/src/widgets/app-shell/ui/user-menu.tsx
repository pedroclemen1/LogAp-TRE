'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useRef, useState, useTransition } from 'react'
import { signOutAction } from '@/features/auth/actions'
import { setLocaleAction } from '@/features/locale/actions'
import type { AppLocale } from '@/i18n/config'
import { Icon } from '@/shared/ui/icon'

const OPTIONS: readonly { locale: AppLocale; labelKey: 'portuguese' | 'english'; short: string }[] = [
  { locale: 'pt-BR', labelKey: 'portuguese', short: 'PT' },
  { locale: 'en-US', labelKey: 'english', short: 'EN' },
]

export function UserMenu({ userInitial, isManager }: { userInitial: string; isManager: boolean }) {
  const t = useTranslations('UserMenu')
  const shellT = useTranslations('Shell')
  const locale = useLocale()
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isChanging, startChange] = useTransition()

  useEffect(() => {
    if (!isOpen) return

    function closeOnOutsideClick(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false)
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isOpen])

  function changeLocale(nextLocale: AppLocale) {
    if (nextLocale === locale) {
      setIsOpen(false)
      return
    }

    startChange(async () => {
      await setLocaleAction(nextLocale)
      setIsOpen(false)
      router.refresh()
    })
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={t('open')}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls="user-preferences-menu"
        onClick={() => setIsOpen((open) => !open)}
        className="group relative flex h-9 w-9 items-center justify-center rounded-full border border-user-avatar-hover bg-user-avatar text-on-user-avatar transition-[background-color,box-shadow] hover:bg-user-avatar-hover hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span aria-hidden="true" className="font-data-mono text-[14px] font-bold leading-none">
          {userInitial}
        </span>
        <span className="absolute -bottom-1 -right-1 min-w-5 rounded-full bg-primary px-1 font-data-mono text-[9px] font-bold leading-4 text-on-primary ring-2 ring-surface">
          {locale === 'pt-BR' ? 'PT' : 'EN'}
        </span>
      </button>

      {isOpen && (
        <div
          id="user-preferences-menu"
          role="menu"
          aria-label={t('title')}
          className="absolute right-0 top-12 z-50 w-[min(calc(100vw-2rem),17rem)] overflow-hidden rounded-sm border border-outline-variant bg-surface-container-lowest text-left shadow-xl"
        >
          <div className="border-b border-outline-variant px-4 py-3">
            <p className="font-semibold text-on-surface">{t('title')}</p>
            <p className="mt-0.5 text-body-sm text-on-surface-variant">{t('language')}</p>
          </div>
          <div className="p-2">
            {OPTIONS.map((option) => {
              const isSelected = locale === option.locale
              return (
                <button
                  key={option.locale}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isSelected}
                  disabled={isChanging}
                  onClick={() => changeLocale(option.locale)}
                  className="flex w-full items-center gap-3 rounded-xs px-3 py-2.5 text-left text-on-surface transition-colors hover:bg-surface-container-low focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-60"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-container font-data-mono text-[11px] font-bold text-on-primary">
                    {option.short}
                  </span>
                  <span className="min-w-0 flex-1 font-body-md text-body-md">{t(option.labelKey)}</span>
                  {isSelected && <Icon name="check" className="text-[19px] text-primary" />}
                </button>
              )
            })}
          </div>
          <div className="border-t border-outline-variant p-2">
            <Link
              href="/alterar-senha"
              role="menuitem"
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center gap-3 rounded-xs px-3 py-2.5 text-left text-on-surface transition-colors hover:bg-surface-container-low focus-visible:outline-2 focus-visible:outline-primary"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
                <Icon name="lock_reset" className="text-[18px]" />
              </span>
              <span className="font-body-md text-body-md font-medium">{t('changePassword')}</span>
            </Link>
            {isManager && (
              <Link
                href="/usuarios"
                role="menuitem"
                onClick={() => setIsOpen(false)}
                className="flex w-full items-center gap-3 rounded-xs px-3 py-2.5 text-left text-on-surface transition-colors hover:bg-surface-container-low focus-visible:outline-2 focus-visible:outline-primary"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
                  <Icon name="person_add" className="text-[18px]" />
                </span>
                <span className="font-body-md text-body-md font-medium">{t('manageUsers')}</span>
              </Link>
            )}
          </div>
          <form action={signOutAction} className="border-t border-outline-variant p-2">
            <button
              type="submit"
              role="menuitem"
              disabled={isChanging}
              className="flex w-full items-center gap-3 rounded-xs px-3 py-2.5 text-left text-error transition-colors hover:bg-error-container/40 focus-visible:outline-2 focus-visible:outline-error disabled:opacity-60"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-error-container text-on-error-container">
                <Icon name="logout" className="text-[18px]" />
              </span>
              <span className="font-body-md text-body-md font-medium">{shellT('logout')}</span>
            </button>
          </form>
          {isChanging && (
            <div className="flex items-center gap-2 border-t border-outline-variant px-4 py-2 text-body-sm text-on-surface-variant" role="status">
              <Icon name="progress_activity" className="animate-spin text-[17px]" />
              {t('changing')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
