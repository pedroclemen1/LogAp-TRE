import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { MetricCard } from '@/shared/ui/metric-card'
import { ProgressBar } from '@/shared/ui/progress-bar'
import { Surface } from '@/shared/ui/surface'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { formatCompact, formatCurrency, formatDate, formatDecimal, formatInteger } from '@/shared/lib/format'
import { buildDistanceBuckets } from '../lib/distance-buckets'
import type { DashboardData, DashboardVehicle, DashboardVehicleKind, FleetStatusCount } from '../model/dashboard'
import { DASHBOARD_PERIOD_DAYS, type DashboardFilters } from '../model/dashboard-filters'
import { DashboardCategoryFilter } from './dashboard-filters'
import { FleetStatusSummary } from './fleet-status-summary'
import { DashboardMaintenanceStatusBadge } from './maintenance-status-badge'

const SPARKLINE_FILLS = ['bg-primary/20', 'bg-primary/35', 'bg-primary/50', 'bg-primary/65', 'bg-primary/80', 'bg-primary', 'bg-primary-container']
const RANKING_FILLS = ['bg-primary', 'bg-primary/80', 'bg-primary/60', 'bg-primary/40', 'bg-primary/20']
const CATEGORY_TONE: Record<DashboardVehicleKind, { dot: string; fill: string }> = {
  light: { dot: 'bg-secondary', fill: 'bg-secondary' },
  heavy: { dot: 'bg-primary', fill: 'bg-primary' },
}
const METRIC_CARD = 'h-32 rounded-b-xs'
const TH = 'px-3 py-2 font-semibold'

function fleetCounts(vehicles: readonly DashboardVehicle[], filters: DashboardFilters): FleetStatusCount[] {
  const visible = filters.category === 'all'
    ? vehicles
    : vehicles.filter((vehicle) => vehicle.kind === filters.category)
  return (['in_use', 'available', 'maintenance'] as const).map((status) => ({
    status,
    count: visible.filter((vehicle) => vehicle.status === status).length,
  }))
}

export function DashboardScreen({ dashboard, vehicles, filters }: {
  dashboard: DashboardData
  vehicles: readonly DashboardVehicle[]
  filters: DashboardFilters
}) {
  const t = useTranslations('Dashboard')
  const locale = useLocale()
  const buckets = buildDistanceBuckets(dashboard.dailyDistance, locale)
  const totalTrips = dashboard.categoryVolumes.reduce((sum, category) => sum + category.tripCount, 0)
  const ranking = dashboard.utilizationRanking.slice(0, 5)
  const rankingMaximum = ranking[0]?.distanceKm ?? 0
  const statusCounts = fleetCounts(vehicles, filters)

  return (
    <div className="space-y-5 lg:space-y-6">
      <div className="flex justify-stretch sm:justify-end">
        <DashboardCategoryFilter filters={filters} />
      </div>

      <div className="grid grid-cols-1 gap-gutter md:grid-cols-2 xl:grid-cols-3">
        <MetricCard label={t('metrics.totalDistance')} icon="route" accent="primary" className={METRIC_CARD}>
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="mb-1 font-data-mono text-[24px] leading-none text-on-surface">
                {formatDecimal(dashboard.totalDistanceKm, locale)}
              </div>
              <div className="font-body-sm text-body-sm text-on-surface-variant">
                {t('metrics.distancePeriod', { days: DASHBOARD_PERIOD_DAYS })}
              </div>
            </div>
            <div className="flex h-9 w-28 items-end gap-1" aria-label={t('metrics.distanceSeries')}>
              {buckets.map((point, index) => (
                <div
                  key={point.id}
                  title={t('metrics.distancePoint', { label: point.label, distance: formatDecimal(point.distanceKm, locale) })}
                  className={`min-w-1 flex-1 ${point.distanceKm === 0 ? 'bg-outline-variant/50' : SPARKLINE_FILLS[index] ?? 'bg-primary'}`}
                  style={{ height: point.distanceKm === 0 ? '2px' : `${Math.max(10, point.height)}%` }}
                />
              ))}
            </div>
          </div>
        </MetricCard>

        <MetricCard label={t('metrics.tripsByCategory')} icon="category" accent="secondary" className={METRIC_CARD}>
          {dashboard.categoryVolumes.length === 0 ? (
            <p className="text-body-sm text-on-surface-variant">{t('metrics.noCompletedTrips')}</p>
          ) : (
            <div className="space-y-2 pt-2">
              {dashboard.categoryVolumes.map((category) => {
                const share = totalTrips === 0 ? 0 : category.tripCount / totalTrips * 100
                const percentage = Math.round(share)
                const tone = CATEGORY_TONE[category.kind]
                return (
                  <div key={category.kind} title={t('metrics.distanceTraveled', { distance: formatDecimal(category.distanceKm, locale) })}>
                    <div className="mb-1 flex items-center justify-between gap-3 text-body-sm">
                      <span className="flex items-center gap-2 font-medium text-on-surface">
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${tone.dot}`} />
                        {t(`vehicleKinds.${category.kind}`)}
                      </span>
                      <span className="font-data-mono text-[11px] font-bold text-on-surface">
                        {t('metrics.tripShare', { count: category.tripCount, countFormatted: formatInteger(category.tripCount, locale), percentage })}
                      </span>
                    </div>
                    <ProgressBar
                      value={share}
                      label={t('metrics.categoryProgress', {
                        category: t(`vehicleKinds.${category.kind}`),
                        count: category.tripCount,
                        countFormatted: formatInteger(category.tripCount, locale),
                        percentage,
                      })}
                      trackClassName="bg-surface-container-highest"
                      fillClassName={tone.fill}
                      className="h-1.5 w-full"
                    />
                  </div>
                )
              })}
            </div>
          )}
        </MetricCard>

        <MetricCard label={t('metrics.maintenanceProjection')} icon="payments" accent="tertiary" className={`${METRIC_CARD} md:col-span-2 xl:col-span-1`}>
          <div>
            <div className="mb-1 font-data-mono text-[24px] leading-none text-error">
              {formatCurrency(dashboard.currentMonthMaintenanceCost, locale)}
            </div>
            <div className="font-body-sm text-body-sm text-on-surface-variant">{t('metrics.currentMonthCosts')}</div>
          </div>
        </MetricCard>
      </div>

      <div className="grid grid-cols-1 gap-gutter xl:grid-cols-12">
        <Surface className="flex flex-col p-4 xl:col-span-7">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="font-headline-sm text-headline-sm text-on-surface">{t('maintenance.title')}</h3>
            <Link href="/manutencoes" className="font-label-caps text-label-caps text-primary hover:underline">{t('maintenance.viewAll')}</Link>
          </div>
          <div className="w-full overflow-x-auto rounded-xs border border-outline-variant/50">
            <Table className="min-w-[620px]">
              <TableHeader className="border-b border-outline-variant/50 bg-surface-container-low">
                <TableRow>
                  <TableHead className={TH}>{t('maintenance.vehicle')}</TableHead>
                  <TableHead className={TH}>{t('maintenance.date')}</TableHead>
                  <TableHead className={TH}>{t('maintenance.serviceType')}</TableHead>
                  <TableHead className={`${TH} text-right`}>{t('maintenance.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-outline-variant/30 font-body-sm text-body-sm text-on-surface">
                {dashboard.upcomingMaintenance.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="px-3 py-8 text-center text-on-surface-variant">{t('maintenance.empty')}</TableCell></TableRow>
                ) : dashboard.upcomingMaintenance.map((row) => (
                  <TableRow key={row.id} className="h-compact-row-height transition-colors hover:bg-surface-container-lowest">
                    <TableCell className="px-3">
                      <span className="block font-data-mono font-bold">{row.vehiclePlate}</span>
                      <span className="text-[11px] text-on-surface-variant">{row.vehicleModel}</span>
                    </TableCell>
                    <TableCell className="px-3 font-data-mono">{formatDate(row.plannedStart, locale)}</TableCell>
                    <TableCell className="max-w-56 truncate px-3" title={row.services}>{row.services}</TableCell>
                    <TableCell className="px-3 text-right"><DashboardMaintenanceStatusBadge status={row.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Surface>

        <Surface className="flex flex-col p-4 xl:col-span-5">
          <h3 className="mb-4 font-headline-sm text-headline-sm text-on-surface">{t('ranking.title')}</h3>
          {ranking.length === 0 ? (
            <div className="flex min-h-32 flex-1 items-center justify-center text-center text-body-sm text-on-surface-variant">
              {t('ranking.empty', { days: DASHBOARD_PERIOD_DAYS })}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {ranking.map((row, index) => (
                <div key={row.vehicleId} className="flex items-center gap-3">
                  <span className="w-20 truncate text-right font-data-mono text-data-mono text-on-surface" title={row.vehiclePlate}>{row.vehiclePlate}</span>
                  <ProgressBar value={rankingMaximum === 0 ? 0 : row.distanceKm / rankingMaximum * 100}
                    label={t('ranking.usage', { plate: row.vehiclePlate })} fillClassName={RANKING_FILLS[index] ?? 'bg-primary'} className="flex-1" />
                  <span className="w-14 text-right font-data-mono text-body-sm text-on-surface-variant">{formatCompact(row.distanceKm, locale)}</span>
                </div>
              ))}
            </div>
          )}

          <FleetStatusSummary items={statusCounts} />
        </Surface>
      </div>
    </div>
  )
}
