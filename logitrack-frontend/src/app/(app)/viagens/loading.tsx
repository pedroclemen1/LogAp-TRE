import { useTranslations } from 'next-intl'

export default function Loading() {
  const t = useTranslations('Trips.loading')
  return (
    <div className="animate-pulse space-y-5 lg:space-y-6" aria-label={t('aria')}>
      <div className="flex justify-end">
        <div className="h-10 w-32 rounded-xs bg-surface-container-high" />
      </div>
      <div className="h-[70px] rounded-xs border border-outline-variant bg-surface" />
      <div className="overflow-hidden rounded-xs border border-outline-variant bg-surface">
        <div className="h-11 bg-table-header" />
        {Array.from({ length: 7 }, (_, index) => (
          <div key={index} className="h-14 border-t border-outline-variant/50 px-4 py-3">
            <div className="h-4 rounded-xs bg-surface-container-high" style={{ width: `${48 + index * 4}%` }} />
          </div>
        ))}
      </div>
    </div>
  )
}
