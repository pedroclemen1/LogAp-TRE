import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { buttonClassName } from '@/shared/ui/button-variants'
import { Icon } from '@/shared/ui/icon'

export default function NotFound() {
  const t = useTranslations('Trips.notFound')
  return (
    <div className="flex min-h-80 items-center justify-center">
      <div className="max-w-lg rounded-sm border border-outline-variant bg-surface p-8 text-center shadow-sm">
        <Icon name="route" className="mb-3 text-[40px] text-on-surface-variant" />
        <h2 className="font-headline-sm text-headline-sm text-on-surface">{t('title')}</h2>
        <p className="mt-2 font-body-sm text-body-sm text-on-surface-variant">
          {t('description')}
        </p>
        <Link href="/viagens" className={buttonClassName('primary', 'md', 'mt-5')}>
          <Icon name="arrow_back" className="text-[18px]" /> {t('back')}
        </Link>
      </div>
    </div>
  )
}
