import Image from 'next/image'

type BrandIdentityProps = {
  compact?: boolean
  align?: 'start' | 'center'
}

export function BrandIdentity({ compact = false, align = 'center' }: BrandIdentityProps) {
  return (
    <div className={`flex flex-col gap-0.5 ${align === 'center' ? 'items-center' : 'items-start'}`}>
      <Image
        src="/img/logo-logap-wordmark.png"
        alt="LogAp"
        width={365}
        height={128}
        sizes={compact ? '112px' : '160px'}
        className={`${compact ? 'w-28' : 'w-40'} h-auto brightness-0 invert opacity-95`}
      />
      <span
        className={`${compact ? 'text-[10px]' : 'text-label-caps'} font-bold uppercase leading-none tracking-[0.18em] text-sidebar-accent`}
      >
        LogiTrack Pro
      </span>
    </div>
  )
}
