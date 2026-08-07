import { cn } from '@/shared/lib/cn'

type ProgressBarProps = {
  /** 0–100. Vira `width` e tambem os atributos ARIA. */
  value: number
  label: string
  /** Classe de cor do preenchimento, ex: "bg-primary/60". */
  fillClassName: string
  trackClassName?: string
  className?: string
}

/**
 * Barra de progresso usada em Dashboard (ranking, volume) e Maintenance
 * (indisponibilidade). Acessivel: os valores viram `role="progressbar"`.
 */
export function ProgressBar({
  value,
  label,
  fillClassName,
  trackClassName = 'bg-surface-container',
  className,
}: ProgressBarProps) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('h-2 rounded-full overflow-hidden', trackClassName, className)}
    >
      <div className={cn('h-full', fillClassName)} style={{ width: `${value}%` }} />
    </div>
  )
}
