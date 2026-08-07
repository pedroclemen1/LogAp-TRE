import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { cn } from '@/shared/lib/cn'
import { Icon } from './icon'

type PaginationArrowProps = {
  direction: 'previous' | 'next'
  /** Ausente significa que nao ha pagina nessa direcao: vira estado desabilitado. */
  href?: string
  className?: string
}

const CONFIG = {
  previous: { icon: 'chevron_left', labelKey: 'previousPage' },
  next: { icon: 'chevron_right', labelKey: 'nextPage' },
} as const

const BASE =
  'inline-flex items-center justify-center rounded-xs transition-colors ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

/**
 * Navegacao por LINK, nao por botao.
 *
 * A pagina atual vive na URL (`?page=3`), entao trocar de pagina e navegar. Isso
 * mantem as telas como Server Components — sem `onClick`, sem `'use client'`, sem
 * estado no cliente — e de graca da botao de voltar, recarregar e link
 * compartilhavel funcionando.
 *
 * Uma seta por vez, nao um par: em Viagens as duas ficam juntas, em Frota os
 * numeros de pagina ficam entre elas. Compor no chamador sai mais barato do que
 * um componente com flags de layout.
 */
export function PaginationArrow({ direction, href, className }: PaginationArrowProps) {
  const t = useTranslations('Common')
  const { icon, labelKey } = CONFIG[direction]
  const label = t(labelKey)
  const glyph = <Icon name={icon} className="text-[20px]" />

  // <span> e nao <a>: link sem destino nao deve receber foco nem ser clicavel.
  if (!href) {
    return (
      <span
        role="link"
        aria-disabled="true"
        aria-label={label}
        className={cn(BASE, 'opacity-50 pointer-events-none', className)}
      >
        {glyph}
      </span>
    )
  }

  return (
    <Link href={href} aria-label={label} className={cn(BASE, className)}>
      {glyph}
    </Link>
  )
}
