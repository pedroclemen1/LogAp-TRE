import { useTranslations } from 'next-intl'

export default function Loading() {
  const t = useTranslations('Maintenance.pageState')
  return (
    <div className="animate-pulse space-y-5 lg:space-y-6" aria-label={t('loading')}>
      <div className="flex justify-end">
        <div className="h-10 w-48 rounded-xs bg-surface-container-high" />
      </div>
      <div className="grid grid-cols-1 gap-gutter sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-[120px] rounded-xs bg-surface-container-high" />)}
      </div>
      <div className="h-36 rounded-xs border border-outline-variant bg-surface" />
      <div className="grid grid-cols-1 gap-gutter xl:grid-cols-12">
        <div className="h-[420px] rounded-xs border border-outline-variant bg-surface xl:col-span-8" />
        <div className="h-[420px] rounded-xs border border-outline-variant bg-surface xl:col-span-4" />
      </div>
    </div>
  )
}
