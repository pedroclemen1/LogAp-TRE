'use client'

import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'
import type { MaintenanceOrder } from '@/features/maintenance/model/maintenance'
import type { AppLocale } from '@/i18n/config'
import { formatDate } from '@/shared/lib/format'
import { Icon } from '@/shared/ui/icon'

type MaintenanceAlertsProps = {
  maintenances: MaintenanceOrder[]
  total: number
  unavailable: boolean
}

function serviceSummary(maintenance: MaintenanceOrder): string {
  const names = maintenance.services.map((service) => service.name)
  if (names.length <= 2) return names.join(' • ')
  return `${names.slice(0, 2).join(' • ')} +${names.length - 2}`
}

function AlertGroup({
  title,
  icon,
  maintenances,
  deadlineLabel,
  onNavigate,
  orderLabel,
  locale,
}: {
  title: string
  icon: string
  maintenances: MaintenanceOrder[]
  deadlineLabel: string
  onNavigate: () => void
  orderLabel: (id: number) => string
  locale: AppLocale
}) {
  if (maintenances.length === 0) return null

  return (
    <section aria-label={title}>
      <div className="flex items-center gap-2 border-b border-outline-variant bg-error-container/35 px-4 py-2 text-error">
        <Icon name={icon} className="text-[18px]" />
        <h3 className="font-label-caps text-label-caps">{title}</h3>
        <span className="ml-auto font-data-mono text-data-mono">{maintenances.length}</span>
      </div>
      <ul className="divide-y divide-outline-variant">
        {maintenances.map((maintenance) => {
          const deadline = maintenance.status === 'pending'
            ? maintenance.plannedStart
            : maintenance.plannedFinish

          return (
            <li key={maintenance.id}>
              <Link
                href={`/manutencoes?veiculo=${maintenance.vehicleId}&status=overdue`}
                onClick={onNavigate}
                className="block px-4 py-3 transition-colors hover:bg-surface-container-low focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-on-surface">
                      {maintenance.vehiclePlate} · {maintenance.vehicleModel}
                    </p>
                    <p className="mt-0.5 truncate text-body-sm text-on-surface-variant">
                      {orderLabel(maintenance.id)} · {serviceSummary(maintenance)}
                    </p>
                  </div>
                  <Icon name="chevron_right" className="shrink-0 text-[18px] text-on-surface-variant" />
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-body-sm font-semibold text-error">
                  <Icon name="schedule" className="text-[16px]" />
                  {deadlineLabel}: {formatDate(deadline, locale)}
                </p>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function MaintenanceAlerts({ maintenances, total, unavailable }: MaintenanceAlertsProps) {
  const t = useTranslations('MaintenanceAlerts')
  const locale = useLocale()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const waitingToStart = maintenances
    .filter((maintenance) => maintenance.status === 'pending')
    .sort((left, right) => left.plannedStart.localeCompare(right.plannedStart))
  const waitingToFinish = maintenances
    .filter((maintenance) => maintenance.status === 'in_progress')
    .sort((left, right) => left.plannedFinish.localeCompare(right.plannedFinish))
  const countLabel = total > 99 ? '99+' : String(total)

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

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={unavailable ? t('buttonUnavailable') : t('buttonLabel', { count: total })}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls="maintenance-alerts-panel"
        onClick={() => setIsOpen((open) => !open)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-xs text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <Icon name="notifications" filled={total > 0} />
        {unavailable ? (
          <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-error px-1 text-center font-bold leading-4 text-on-error">
            !
          </span>
        ) : total > 0 && (
          <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-error px-1 text-center font-data-mono text-[10px] leading-4 text-on-error">
            {countLabel}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          id="maintenance-alerts-panel"
          role="dialog"
          aria-label={t('title')}
          className="absolute right-0 top-12 z-50 w-[min(calc(100vw-2rem),25rem)] overflow-hidden rounded-sm border border-outline-variant bg-surface-container-lowest text-left shadow-xl"
        >
          <div className="flex items-center justify-between gap-4 border-b border-outline-variant px-4 py-3">
            <div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface">{t('title')}</h2>
              <p className="mt-0.5 text-body-sm text-on-surface-variant">
                {unavailable ? t('unavailableSummary') : t('summary', { count: total })}
              </p>
            </div>
            <button
              type="button"
              aria-label={t('close')}
              onClick={() => setIsOpen(false)}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xs text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface focus-visible:outline-2 focus-visible:outline-primary"
            >
              <Icon name="close" className="text-[19px]" />
            </button>
          </div>

          {unavailable ? (
            <div className="flex flex-col items-center px-6 py-8 text-center">
              <Icon name="cloud_off" className="text-[36px] text-error" />
              <p className="mt-2 font-semibold text-on-surface">{t('unavailableTitle')}</p>
              <p className="mt-1 text-body-sm text-on-surface-variant">{t('unavailableDescription')}</p>
            </div>
          ) : maintenances.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-8 text-center">
              <Icon name="check_circle" className="text-[36px] text-primary" />
              <p className="mt-2 font-semibold text-on-surface">{t('emptyTitle')}</p>
              <p className="mt-1 text-body-sm text-on-surface-variant">
                {t('emptyDescription')}
              </p>
            </div>
          ) : (
            <div className="max-h-[min(65vh,32rem)] overflow-y-auto">
              <AlertGroup
                title={t('notStarted')}
                icon="pending_actions"
                maintenances={waitingToStart}
                deadlineLabel={t('plannedStart')}
                onNavigate={() => setIsOpen(false)}
                orderLabel={(id) => t('order', { id })}
                locale={locale}
              />
              <AlertGroup
                title={t('notFinished')}
                icon="engineering"
                maintenances={waitingToFinish}
                deadlineLabel={t('plannedFinish')}
                onNavigate={() => setIsOpen(false)}
                orderLabel={(id) => t('order', { id })}
                locale={locale}
              />
            </div>
          )}

          {!unavailable && total > 0 && (
            <Link
              href="/manutencoes?status=overdue"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center gap-2 border-t border-outline-variant px-4 py-3 font-semibold text-primary hover:bg-surface-container-low focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
            >
              {t('viewAll')}
              <Icon name="arrow_forward" className="text-[18px]" />
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
