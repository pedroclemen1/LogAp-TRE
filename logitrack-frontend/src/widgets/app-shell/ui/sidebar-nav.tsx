'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Icon } from '@/shared/ui/icon'
import { NAV_ITEMS, SIDEBAR_ITEM_ACTIVE, SIDEBAR_ITEM_IDLE } from '../config/navigation'

/**
 * Client apenas por causa de `usePathname`. A lista em si e estatica e vem de
 * `config/navigation`, importavel por Server Components.
 */
export function SidebarNav() {
  const pathname = usePathname()
  const t = useTranslations('Navigation')

  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-4">
      {NAV_ITEMS.map((item) => {
        const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={isActive ? SIDEBAR_ITEM_ACTIVE : SIDEBAR_ITEM_IDLE}
          >
            <Icon name={item.icon} />
            {t(item.key)}
          </Link>
        )
      })}
    </nav>
  )
}
