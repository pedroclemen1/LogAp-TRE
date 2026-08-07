import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import { Icon } from './icon'

/** Acentos disponiveis para a borda superior de 2px do card. */
type MetricAccent = 'primary' | 'secondary' | 'tertiary' | 'tertiary-container' | 'error'

const ACCENT: Record<MetricAccent, string> = {
  primary: 'border-t-primary',
  secondary: 'border-t-secondary',
  tertiary: 'border-t-tertiary',
  'tertiary-container': 'border-t-tertiary-container',
  error: 'border-t-error',
}

const ICON_TONE: Record<MetricAccent, string> = {
  primary: 'text-primary',
  secondary: 'text-secondary',
  tertiary: 'text-tertiary',
  'tertiary-container': 'text-tertiary-container',
  error: 'text-error',
}

type MetricCardProps = {
  label: string
  icon: string
  accent: MetricAccent
  children: ReactNode
  /** Altura, colspan e raio variam entre Dashboard e Maintenance. */
  className?: string
}

/**
 * Card de metrica com faixa de acento no topo — contrato comum entre
 * Dashboard e Maintenance. O corpo e livre porque cada
 * tela mostra algo diferente (sparkline, barra, delta).
 */
export function MetricCard({ label, icon, accent, children, className }: MetricCardProps) {
  return (
    <div className={cn('bg-surface border border-outline-variant p-4 flex flex-col justify-between border-t-2', ACCENT[accent], className)}>
      <div className="flex justify-between items-start">
        <span className="font-label-caps text-label-caps text-on-surface-variant">{label}</span>
        <Icon name={icon} className={cn('text-[20px]', ICON_TONE[accent])} />
      </div>
      {children}
    </div>
  )
}
