import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import type { AppLocale } from '@/i18n/config'
import { formatDateTime, formatDecimal, formatInteger, formatKilometers } from '@/shared/lib/format'
import { Icon } from '@/shared/ui/icon'
import type { DriverOption, TripDetails, VehicleOption } from '../model/trip'
import { TripChangeLog } from './trip-change-log'
import { TripDetailsActions } from './trip-details-actions'
import { TripRouteTimeline } from './trip-route-timeline'
import { TripStatusBadge, VehicleKindTag } from './trip-status-badge'

const CARD = 'rounded-lg border border-outline-variant bg-surface'
const CARD_TITLE = 'm-0 font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant'
const DETAIL_ROW = 'flex items-center justify-between gap-4 border-b border-outline-variant/30 py-2 last:border-0'
const DETAIL_LABEL = 'font-body-sm text-body-sm text-on-surface-variant'
const DETAIL_VALUE = 'text-right font-data-mono text-data-mono font-medium text-on-surface'

function tripNumber(id: number): string {
  return `#${String(id).padStart(4, '0')}`
}

function optionalDateTime(value: string | undefined, locale: AppLocale): string {
  return value ? formatDateTime(value, locale) : '—'
}

export function TripDetailsScreen({
  details,
  vehicles,
  drivers,
}: {
  details: TripDetails
  vehicles: readonly VehicleOption[]
  drivers: readonly DriverOption[]
}) {
  const t = useTranslations('Trips.details')
  const locale = useLocale()
  const { trip, stages, events } = details

  return (
    <div className="mx-auto max-w-7xl space-y-5 lg:space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <Link
              href="/viagens"
              aria-label={t('backAria')}
              className="flex items-center text-on-surface-variant transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <Icon name="arrow_back" />
            </Link>
            <h2 className="truncate font-headline-md text-headline-md text-on-surface">
              {t('title', { number: tripNumber(trip.id) })}
            </h2>
            <TripStatusBadge status={trip.status} />
          </div>
          <p className="mt-1 truncate pl-9 font-body-sm text-body-sm text-on-surface-variant">
            {trip.origin} → {trip.destination}
          </p>
        </div>
        <TripDetailsActions trip={trip} stages={stages} vehicles={vehicles} drivers={drivers} />
      </div>

      <div className="grid grid-cols-1 gap-gutter lg:grid-cols-12">
        <div className="space-y-gutter lg:col-span-8">
          <section className={`${CARD} p-4 lg:p-6`}>
            <h3 className={`${CARD_TITLE} mb-6`}>{t('logisticsRoute')}</h3>
            <TripRouteTimeline
              tripId={trip.id}
              origin={trip.origin}
              departureAt={trip.departureAt}
              startedAt={trip.startedAt}
              status={trip.status}
              stages={stages}
            />
          </section>

          <div className="grid grid-cols-1 gap-gutter md:grid-cols-2">
            <section className={`${CARD} border-t-2 border-t-secondary p-5 shadow-sm`}>
              <div className="mb-4 flex items-center gap-2">
                <Icon name="directions_car" className="text-secondary" />
                <h3 className={CARD_TITLE}>{t('vehicleAssignment')}</h3>
              </div>
              <dl className="space-y-1">
                <div className={DETAIL_ROW}>
                  <dt className={DETAIL_LABEL}>{t('plate')}</dt>
                  <dd className={`${DETAIL_VALUE} flex items-center gap-2`}>
                    {trip.vehiclePlate} <VehicleKindTag kind={trip.vehicleKind} />
                  </dd>
                </div>
                <div className={DETAIL_ROW}>
                  <dt className={DETAIL_LABEL}>{t('model')}</dt>
                  <dd className="text-right font-body-sm text-body-sm font-medium text-on-surface">{trip.vehicleModel}</dd>
                </div>
                <div className={DETAIL_ROW}>
                  <dt className={DETAIL_LABEL}>{t('driver')}</dt>
                  <dd className="text-right font-body-sm text-body-sm font-medium text-on-surface">
                    {trip.driverName ?? t('notAssigned')}
                  </dd>
                </div>
                <div className={DETAIL_ROW}>
                  <dt className={DETAIL_LABEL}>{t('initialLoad')}</dt>
                  <dd className={DETAIL_VALUE}>{trip.loadKg === undefined ? '—' : `${formatDecimal(trip.loadKg, locale)} kg`}</dd>
                </div>
              </dl>
            </section>

            <section className={`${CARD} border-t-2 border-t-primary p-5 shadow-sm`}>
              <div className="mb-4 flex items-center gap-2">
                <Icon name="schedule" className="text-primary" />
                <h3 className={CARD_TITLE}>{t('scheduleTiming')}</h3>
              </div>
              <dl className="space-y-1">
                <div className={DETAIL_ROW}>
                  <dt className={DETAIL_LABEL}>{t('plannedDeparture')}</dt>
                  <dd className={DETAIL_VALUE}>{formatDateTime(trip.departureAt, locale)}</dd>
                </div>
                <div className={DETAIL_ROW}>
                  <dt className={DETAIL_LABEL}>{t('actualStart')}</dt>
                  <dd className={DETAIL_VALUE}>{optionalDateTime(trip.startedAt, locale)}</dd>
                </div>
                <div className={DETAIL_ROW}>
                  <dt className={DETAIL_LABEL}>{t('expectedArrival')}</dt>
                  <dd className={DETAIL_VALUE}>{optionalDateTime(trip.expectedArrivalAt, locale)}</dd>
                </div>
                <div className={DETAIL_ROW}>
                  <dt className={DETAIL_LABEL}>{t('actualArrival')}</dt>
                  <dd className={DETAIL_VALUE}>{optionalDateTime(trip.arrivalAt, locale)}</dd>
                </div>
                <div className={DETAIL_ROW}>
                  <dt className={DETAIL_LABEL}>{t('canceledAt')}</dt>
                  <dd className={trip.canceledAt ? `${DETAIL_VALUE} text-error` : DETAIL_VALUE}>
                    {optionalDateTime(trip.canceledAt, locale)}
                  </dd>
                </div>
                <div className={DETAIL_ROW}>
                  <dt className={DETAIL_LABEL}>{t('tripId')}</dt>
                  <dd className={DETAIL_VALUE}>{tripNumber(trip.id)}</dd>
                </div>
              </dl>
            </section>
          </div>
        </div>

        <aside className="space-y-gutter lg:col-span-4">
          <div className="grid grid-cols-2 gap-gutter">
            <div className="rounded-sm border border-l-4 border-outline-variant border-l-tertiary bg-surface p-3 shadow-sm">
              <p className="mb-1 font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">{t('distance')}</p>
              <p className="font-data-mono text-headline-sm font-bold text-on-surface">{formatKilometers(trip.distanceKm, locale)}</p>
            </div>
            <div className="rounded-sm border border-l-4 border-outline-variant border-l-primary-container bg-surface p-3 shadow-sm">
              <p className="mb-1 font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">{t('routeStages')}</p>
              <p className="font-data-mono text-headline-sm font-bold text-on-surface">
                {formatInteger(stages.length, locale)} <span className="font-normal text-[11px] text-on-surface-variant">{t('stageCount', { count: stages.length })}</span>
              </p>
            </div>
          </div>

          <section className={`${CARD} flex flex-col`}>
            <div className="rounded-t-lg border-b border-outline-variant bg-surface-container-lowest p-4">
              <h3 className={`${CARD_TITLE} flex items-center gap-2`}>
                <Icon name="history" className="text-[16px]" /> {t('changeLog')}
              </h3>
            </div>
            <TripChangeLog entries={events} />
          </section>
        </aside>
      </div>
    </div>
  )
}
