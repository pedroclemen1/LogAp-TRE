'use client'

import { signOutAction } from '@/features/auth/actions'
import { useTranslations } from 'next-intl'
import { useTheme } from '@/shared/theme/use-theme'
import { Icon } from '@/shared/ui/icon'
import { SIDEBAR_ITEM_IDLE } from '../config/navigation'

/**
 * Os dois unicos itens interativos da sidebar.
 *
 * O logout e um `<form action={...}>` e nao um `onClick`: apagar o cookie
 * httpOnly so e possivel no servidor, e o form funciona mesmo sem JavaScript.
 */
export function SidebarFooter() {
  const { isDark, toggle } = useTheme()
  const t = useTranslations('Shell')

  return (
    <div className="border-t border-outline-variant/20 p-4 flex flex-col gap-1">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={isDark}
        className={`${SIDEBAR_ITEM_IDLE} w-full text-left`}
      >
        <Icon name={isDark ? 'light_mode' : 'dark_mode'} />
        {isDark ? t('lightMode') : t('darkMode')}
      </button>
      <form action={signOutAction}>
        <button type="submit" className={`${SIDEBAR_ITEM_IDLE} text-left w-full`}>
          <Icon name="logout" />
          {t('logout')}
        </button>
      </form>
    </div>
  )
}
