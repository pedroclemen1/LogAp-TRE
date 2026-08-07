'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Select } from '@/shared/ui/select'
import type { DashboardFilters } from '../model/dashboard-filters'

export function DashboardCategoryFilter({ filters }: { filters: DashboardFilters }) {
  const router = useRouter()
  const t = useTranslations('Dashboard.filters')
  const [isPending, startTransition] = useTransition()
  const category = filters.category === 'light' ? 'LEVE' : filters.category === 'heavy' ? 'PESADO' : ''

  function changeCategory(value: string) {
    startTransition(() => router.push(value ? `/?tipo=${value}` : '/'))
  }

  return (
    <div className="flex w-full items-center gap-2 sm:w-auto">
      <span className="hidden font-label-caps text-label-caps uppercase text-on-surface-variant sm:inline">
        {t('category')}
      </span>
      <Select
        key={category}
        aria-label={t('ariaLabel')}
        defaultValue={category}
        disabled={isPending}
        onChange={(event) => changeCategory(event.target.value)}
        options={[
          { value: '', label: t('all') },
          { value: 'LEVE', label: t('light') },
          { value: 'PESADO', label: t('heavy') },
        ]}
        wrapperClassName="w-full sm:w-auto"
        className="h-10 w-full min-w-48 bg-surface sm:w-auto disabled:cursor-wait disabled:opacity-70"
      />
    </div>
  )
}
