'use client'

import { useLocale, useTranslations } from 'next-intl'
import type { AppLocale } from '@/i18n/config'
import { formatDateTime, formatKilometers } from '@/shared/lib/format'
import { Button } from '@/shared/ui/button'
import { Icon } from '@/shared/ui/icon'
import { IconButton } from '@/shared/ui/icon-button'
import { RoutePath } from '@/shared/ui/route-path'
import { TableCell, TableRow } from '@/shared/ui/table'
import { TripStatusBadge } from '@/features/trips/components/trip-status-badge'
import { candidateRoutePath, type ManifestCandidate, type ManifestStage } from '../model/manifest'

const LABEL = 'font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant'

export function ManifestTripRow({
  candidate,
  expanded,
  busy,
  onToggle,
  onIssue,
  onView,
}: {
  candidate: ManifestCandidate
  expanded: boolean
  busy: boolean
  onToggle: () => void
  onIssue: (stage: ManifestStage) => void
  onView: (manifestId: number) => void
}) {
  const t = useTranslations('Manifest.screen')
  const locale = useLocale() as AppLocale

  const issued = candidate.stages.filter((stage) => stage.manifestId !== undefined).length

  return (
    <>
      <TableRow className="transition-colors hover:bg-surface-container-low">
        <TableCell className="p-3">
          <IconButton
            aria-label={expanded
              ? t('collapseAria', { id: candidate.tripId })
              : t('expandAria', { id: candidate.tripId })}
            aria-expanded={expanded}
            title={expanded ? t('collapse') : t('expand')}
            icon={expanded ? 'visibility_off' : 'visibility'}
            iconClassName="text-[18px]"
            className={`h-8 w-8 ${expanded ? 'text-primary' : 'text-on-surface-variant'}`}
            onClick={onToggle}
          />
        </TableCell>
        <TableCell className="p-3 font-data-mono text-data-mono font-bold text-on-surface">
          {t('tripNumber', { id: candidate.tripId })}
        </TableCell>
        <TableCell className="p-3 font-data-mono text-data-mono text-on-surface-variant">
          {formatDateTime(candidate.departureAt, locale)}
        </TableCell>
        <TableCell className="p-3">
          <RoutePath path={candidateRoutePath(candidate)} />
        </TableCell>
        <TableCell className="p-3">
          <div className="flex flex-col">
            <span className="font-data-mono text-data-mono font-bold text-on-surface">
              {candidate.vehiclePlate}
            </span>
            <span className="text-[10px] text-on-surface-variant">
              {candidate.driverName ?? t('noDriver')}
            </span>
          </div>
        </TableCell>
        <TableCell className="p-3"><TripStatusBadge status={candidate.status} /></TableCell>
        <TableCell className="p-3 text-right">
          <span className="font-data-mono text-data-mono text-on-surface-variant">
            {t('issuedOfTotal', { issued, total: candidate.stages.length })}
          </span>
        </TableCell>
      </TableRow>

      {expanded && (
        <TableRow className="bg-surface-container-lowest">
          <TableCell colSpan={7} className="p-0">
            <div className="border-l-4 border-primary px-6 py-4">
              <p className={`${LABEL} mb-3`}>{t('stagesTitle')}</p>

              <ul className="space-y-2">
                {candidate.stages.map((stage) => (
                  <li
                    key={stage.stageId}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xs border border-outline-variant bg-surface px-3 py-2"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="font-data-mono text-data-mono font-bold text-on-surface-variant">
                        {String(stage.order).padStart(2, '0')}
                      </span>
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-1.5 font-body-sm text-body-sm text-on-surface">
                          <span className="max-w-[180px] truncate" title={stage.origin}>{stage.origin}</span>
                          <Icon name="arrow_right_alt" className="text-[14px] text-outline" />
                          <span className="max-w-[180px] truncate font-medium" title={stage.destination}>
                            {stage.destination}
                          </span>
                        </p>
                        <p className="mt-0.5 font-data-mono text-[11px] text-on-surface-variant">
                          {formatKilometers(stage.distanceKm, locale)}
                          {' · '}
                          {stage.arrivedAt
                            ? t('arrivedAt', { date: formatDateTime(stage.arrivedAt, locale) })
                            : t('notArrived')}
                        </p>
                      </div>
                    </div>

                    {stage.manifestId !== undefined ? (
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={busy}
                        onClick={() => onView(stage.manifestId as number)}
                      >
                        <Icon name="description" className="text-[16px]" /> {t('openManifest')}
                      </Button>
                    ) : stage.completed ? (
                      <Button size="sm" variant="primary" disabled={busy} onClick={() => onIssue(stage)}>
                        <Icon name="post_add" className="text-[16px]" /> {t('generate')}
                      </Button>
                    ) : (
                      <span className="flex items-center gap-1.5 font-body-sm text-[11px] text-on-surface-variant">
                        <Icon name="info" className="text-[14px] text-tertiary" />
                        {t('onlyCompletedStage')}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
