import { cn } from '@/shared/lib/cn'

type IconProps = {
  /** Nome do glifo no Material Symbols Outlined, ex: "local_shipping". */
  name: string
  className?: string
  /** Usa o eixo FILL da fonte variavel. */
  filled?: boolean
}

export function Icon({ name, className, filled = false }: IconProps) {
  return (
    <span aria-hidden="true" className={cn('material-symbols-outlined', filled && 'filled', className)}>
      {name}
    </span>
  )
}
