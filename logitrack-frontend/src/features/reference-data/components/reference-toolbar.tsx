'use client'

import { useTranslations } from 'next-intl'
import { Icon } from '@/shared/ui/icon'
import { Select } from '@/shared/ui/select'
import { TextInput } from '@/shared/ui/text-input'
import { useReferenceFiltersController } from '../controllers/use-reference-filters-controller'
import type { ReferenceFilters } from '../model/reference-data'

const CONTROL =
  'h-[36px] rounded-xs border border-outline-variant bg-surface-container-lowest font-body-sm text-body-sm ' +
  'text-on-surface outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary'

export function ReferenceToolbar({
  pathname,
  filters,
  placeholder,
}: {
  pathname: string
  filters: ReferenceFilters
  placeholder: string
}) {
  const t = useTranslations('Reference.common')
  const controller = useReferenceFiltersController(pathname, filters)
  const statusOptions = [
    { value: 'active', label: t('active') },
    { value: 'inactive', label: t('inactive') },
    { value: 'all', label: t('allStatuses') },
  ]
  return (
    <div className="flex flex-col gap-3 rounded-xs border border-outline-variant bg-surface p-4 sm:flex-row sm:items-center">
      <TextInput
        type="search"
        aria-label={placeholder}
        placeholder={placeholder}
        leadingIcon="search"
        leadingIconClassName="text-[18px]"
        wrapperClassName="w-full sm:max-w-sm"
        className={`${CONTROL} w-full pl-9 pr-9`}
        defaultValue={filters.search}
        onChange={(event) => controller.changeSearch(event.target.value)}
        trailing={controller.isPending
          ? <Icon name="progress_activity" aria-label={t('filtering')} className="animate-spin text-[18px] text-on-surface-variant" />
          : undefined}
      />
      <Select
        aria-label={t('status')}
        options={statusOptions}
        value={filters.status}
        onChange={(event) => controller.changeStatus(event.target.value)}
        wrapperClassName="w-full sm:w-44"
        className={`${CONTROL} w-full`}
      />
    </div>
  )
}
