import { useLocale, useTranslations } from 'next-intl'
import { formatDateTime, formatDecimal, formatKilometers } from '@/shared/lib/format'
import { Icon } from '@/shared/ui/icon'
import { StageArrivalButton } from './stage-arrival-button'
import type { RouteStage, RouteStageState, TripStatus } from '../model/trip'

type StageVisual = {
  node: string
  nodeIcon: string
  city: string
  time: string
  tag: string
  pulse: boolean
}

type TimelinePoint = {
  id: string
  /** Id do trecho no banco; ausente no ponto sintetico de origem. */
  stageId?: number
  city: string
  expectedAt?: string
  actualAt?: string
  role: 'origin' | 'stop' | 'destination'
  state: RouteStageState
  distanceKm?: number
  loadKg?: number
}

const STATE_VISUAL: Record<RouteStageState, StageVisual> = {
  completed: {
    node: 'bg-primary', nodeIcon: 'text-on-primary', city: 'text-on-surface',
    time: 'text-on-surface-variant', tag: 'bg-surface-container-high text-on-surface', pulse: false,
  },
  active: {
    node: 'bg-primary-container', nodeIcon: 'text-on-primary-container', city: 'text-on-surface',
    time: 'text-primary', tag: 'border border-primary/30 text-primary', pulse: true,
  },
  pending: {
    node: 'bg-surface-container-highest', nodeIcon: 'text-on-surface-variant', city: 'text-on-surface-variant',
    time: 'text-on-surface-variant', tag: 'bg-surface-container text-on-surface-variant', pulse: false,
  },
  canceled: {
    node: 'bg-error-container', nodeIcon: 'text-on-error-container', city: 'text-on-surface-variant',
    time: 'text-error', tag: 'bg-error-container text-on-error-container', pulse: false,
  },
}

const ROLE_ICON = { origin: 'location_on', stop: 'sync_alt', destination: 'flag' } as const
function originState(status: TripStatus): RouteStageState {
  if (status === 'scheduled') return 'pending'
  if (status === 'canceled') return 'canceled'
  return 'completed'
}

export function TripRouteTimeline({
  tripId,
  origin,
  departureAt,
  startedAt,
  status,
  stages,
}: {
  tripId: number
  origin: string
  departureAt: string
  startedAt?: string
  status: TripStatus
  stages: readonly RouteStage[]
}) {
  const t = useTranslations('Trips.timeline')
  const locale = useLocale()
  const points: TimelinePoint[] = [
    {
      id: 'origin', city: origin, expectedAt: departureAt,
      actualAt: startedAt,
      role: 'origin', state: originState(status),
    },
    ...stages.map((stage) => ({ ...stage, id: String(stage.id), stageId: stage.id })),
  ]
  const lastCompletedIndex = points.reduce(
    (latest, point, index) => point.state === 'completed' ? index : latest,
    -1,
  )
  const progress = points.length <= 1
    ? (lastCompletedIndex === 0 ? 100 : 0)
    : Math.max(0, (lastCompletedIndex / (points.length - 1)) * 100)

  function timeLabel(point: TimelinePoint): string {
    if (point.actualAt) return t('actual', { date: formatDateTime(point.actualAt, locale) })
    if (point.expectedAt) return t('eta', { date: formatDateTime(point.expectedAt, locale) })
    return point.role === 'origin' ? t('departure') : t('scheduleMissing')
  }

  function tagLabel(point: TimelinePoint): string {
    if (point.state === 'active') return t('inProgress')
    if (point.state === 'canceled') return t('canceled')
    return t(point.role)
  }

  return (
    <div className="relative flex w-full flex-col items-start justify-between px-4 py-8 md:flex-row md:items-start md:px-8">
      <div className="absolute bottom-12 left-8 top-12 z-0 w-[2px] bg-outline-variant md:hidden" />
      <div className="absolute left-8 top-12 z-0 w-[2px] bg-primary md:hidden" style={{ height: `${progress}%` }} />
      <div className="absolute left-12 right-12 top-12 z-0 hidden h-[2px] bg-outline-variant md:block" />
      <div
        className="absolute left-12 top-12 z-0 hidden h-[2px] bg-primary md:block"
        style={{ width: `calc((100% - 6rem) * ${progress / 100})` }}
      />

      {points.map((point, index) => {
        const visual = STATE_VISUAL[point.state]
        return (
          <div
            key={point.id}
            className={`relative z-10 flex w-full items-start gap-4 md:min-w-0 md:flex-1 md:flex-col md:items-center md:gap-2 ${
              index < points.length - 1 ? 'mb-8 md:mb-0' : ''
            }`}
          >
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-4 border-surface shadow-sm ${visual.node} ${visual.pulse ? 'animate-pulse' : ''}`}>
              <Icon name={ROLE_ICON[point.role]} className={`text-[16px] ${visual.nodeIcon}`} />
            </div>
            <div className="min-w-0 text-left md:text-center">
              <p className={`max-w-48 truncate font-body-sm text-body-sm font-bold ${visual.city}`} title={point.city}>
                {point.city}
              </p>
              <p className={`font-data-mono text-[11px] ${visual.time}`}>{timeLabel(point)}</p>
              {point.distanceKm !== undefined && point.loadKg !== undefined && (
                <p className="mt-1 font-data-mono text-[10px] text-on-surface-variant">
                  {formatKilometers(point.distanceKm, locale)} • {formatDecimal(point.loadKg, locale)} kg
                </p>
              )}
              <span className={`mt-1 inline-block rounded-xs px-1.5 py-0.5 text-[10px] font-bold uppercase ${visual.tag}`}>
                {tagLabel(point)}
              </span>
              {/*
                So o trecho ATIVO ganha botao: a ordem da rota e obrigatoria no
                backend, entao oferecer o botao nos pendentes seguintes so
                produziria erro. O estado 'active' ja e, por construcao, o
                proximo pendente de uma viagem em andamento.
              */}
              {point.state === 'active' && point.stageId !== undefined && (
                <div className="flex md:justify-center">
                  <StageArrivalButton
                    tripId={tripId}
                    stageId={point.stageId}
                    city={point.city}
                    isFinalDestination={index === points.length - 1}
                  />
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}