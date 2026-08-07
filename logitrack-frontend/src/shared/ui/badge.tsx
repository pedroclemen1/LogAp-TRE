import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

type BadgeShape = 'square' | 'pill'

const SHAPE: Record<BadgeShape, string> = {
  /** 2px: o DESIGN.md reserva o raio menor para "tags"/status. */
  square: 'rounded-xs',
  pill: 'rounded-full',
}

type BadgeProps = {
  children: ReactNode
  shape?: BadgeShape
  /**
   * Cor E tipografia da variante. Peso e tamanho ficam de fora da base de
   * proposito: as telas usam 10px/11px e bold/medium/normal, e no Tailwind o
   * vencedor de `font-bold` vs `font-normal` e definido pela ordem no CSS
   * gerado, nao pela ordem no className — deixar isso na base exigiria
   * `tailwind-merge` para algo que a composicao resolve de graca.
   */
  className?: string
}

/** Layout e forma do status badge. A semantica vive no `*-status-badge` de cada feature. */
export function Badge({ children, shape = 'square', className }: BadgeProps) {
  return <span className={cn('inline-flex items-center gap-1 px-2 py-0.5', SHAPE[shape], className)}>{children}</span>
}
