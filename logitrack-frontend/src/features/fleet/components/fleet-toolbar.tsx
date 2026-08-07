'use client'

import { Icon } from '@/shared/ui/icon'
import { useTranslations } from 'next-intl'
import { Select } from '@/shared/ui/select'
import { TextInput } from '@/shared/ui/text-input'
import { useFleetFiltersController } from '../controllers/use-fleet-filters-controller'
import type { FleetFilters } from '../model/fleet-filters'

const CONTROL =
  'bg-surface-container-lowest text-on-surface rounded-xs border border-outline-variant h-[36px] ' +
  'font-body-sm text-body-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary'

type FleetToolbarProps = {
  filters: FleetFilters
  /** Montados no servidor com os mesmos filtros, para os arquivos baterem com a tela. */
  exportCsvHref: string
  exportXlsHref: string
}

export function FleetToolbar({ filters, exportCsvHref, exportXlsHref }: FleetToolbarProps) {
  const t = useTranslations('Fleet.toolbar')
  const { isPending, changeSearch, changeCategory, changeStatus } = useFleetFiltersController(filters)
  const categoryOptions = [
    { value: '', label: t('allCategories') },
    { value: 'heavy', label: t('heavy') },
    { value: 'light', label: t('light') },
  ]
  const statusOptions = [
    { value: '', label: t('allStatuses') },
    { value: 'available', label: t('available') },
    { value: 'in_use', label: t('inUse') },
    { value: 'maintenance', label: t('maintenance') },
  ]

  return (
    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-surface p-4 rounded-xs border border-outline-variant">
      <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
        <TextInput
          type="search"
          aria-label={t('searchAria')}
          placeholder={t('searchPlaceholder')}
          leadingIcon="search"
          leadingIconClassName="text-[18px]"
          wrapperClassName="w-full sm:w-64"
          className={`${CONTROL} w-full pl-9 pr-9 py-2`}
          // Nao-controlado: o valor da URL so define o estado inicial. Fosse
          // controlado, cada re-render do servidor durante o debounce
          // devolveria o cursor para o texto antigo enquanto se digita.
          defaultValue={filters.search}
          onChange={(event) => changeSearch(event.target.value)}
          trailing={
            isPending ? (
              <Icon
                name="progress_activity"
                aria-label={t('filtering')}
                className="text-[18px] text-on-surface-variant animate-spin"
              />
            ) : undefined
          }
        />

        <div className="h-6 w-px bg-outline-variant hidden sm:block" />

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select
            aria-label={t('category')}
            options={categoryOptions}
            value={filters.category ?? ''}
            onChange={(event) => changeCategory(event.target.value)}
            wrapperClassName="w-full sm:w-40"
            className={`${CONTROL} w-full`}
          />
          <Select
            aria-label={t('status')}
            options={statusOptions}
            value={filters.status ?? ''}
            onChange={(event) => changeStatus(event.target.value)}
            wrapperClassName="w-full sm:w-40"
            className={`${CONTROL} w-full`}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <details className="group relative">
          <summary className="flex h-[36px] cursor-pointer list-none items-center gap-2 rounded-xs border border-outline-variant bg-surface-container-lowest px-3 font-body-sm text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container-low focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            <Icon name="download" className="text-[18px]" />
            {t('export')}
            <Icon name="expand_more" className="text-[18px] transition-transform group-open:rotate-180" />
          </summary>
          <div className="absolute right-0 z-20 mt-1 min-w-44 overflow-hidden rounded-xs border border-outline-variant bg-surface shadow-lg">
            <a
              href={exportCsvHref}
              download
              className="flex items-center gap-3 px-4 py-3 font-body-sm text-body-sm text-on-surface hover:bg-surface-container-low"
            >
              <Icon name="description" className="text-[18px] text-primary" />
              {t('exportCsv')}
            </a>
            <a
              href={exportXlsHref}
              download
              className="flex items-center gap-3 border-t border-outline-variant px-4 py-3 font-body-sm text-body-sm text-on-surface hover:bg-surface-container-low"
            >
              <Icon name="table_view" className="text-[18px] text-primary" />
              {t('exportXls')}
            </a>
          </div>
        </details>
      </div>
    </div>
  )
}
