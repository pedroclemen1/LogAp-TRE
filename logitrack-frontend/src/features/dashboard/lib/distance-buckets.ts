import type { AppLocale } from '@/i18n/config'
import { formatDateRange } from '@/shared/lib/format'
import type { DailyDistance, DistanceBucket } from '../model/dashboard'

/** Agrupa a janela fixa de 30 dias em seis barras de cinco dias. */
export function buildDistanceBuckets(points: readonly DailyDistance[], locale: AppLocale): DistanceBucket[] {
  const chunkSize = 5
  const raw = Array.from({ length: Math.ceil(points.length / chunkSize) }, (_, index) => {
    const chunk = points.slice(index * chunkSize, (index + 1) * chunkSize)
    const first = chunk[0]
    const last = chunk.at(-1)
    return {
      id: `${first?.date ?? index}-${last?.date ?? index}`,
      label: first && last ? formatDateRange(first.date, last.date === first.date ? undefined : last.date, locale) : '',
      distanceKm: chunk.reduce((sum, point) => sum + point.distanceKm, 0),
    }
  })
  const maximum = Math.max(0, ...raw.map((point) => point.distanceKm))
  return raw.map((point) => ({
    ...point,
    height: maximum === 0 ? 0 : point.distanceKm / maximum * 100,
  }))
}
