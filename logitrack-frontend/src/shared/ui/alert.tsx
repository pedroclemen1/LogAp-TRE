import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import { Icon } from './icon'

type AlertTone = 'info' | 'warning' | 'error'

/*
 * O tom de aviso e o unico com cor FIXA, e por isso precisa de variante
 * escura explicita.
 *
 * O creme `#FEF7E0` nao vem do tema: fica igual nos dois modos. So que o texto
 * dentro do alerta usa token (`on-surface`), que no escuro clareia — e o titulo
 * caia em 1,05:1 sobre o fundo creme, praticamente invisivel. `info` e `error`
 * nunca tiveram o problema porque sao token com alfa e acompanham o tema
 * sozinhos.
 *
 * No escuro o aviso passa a usar `tertiary` (o papel ambar da paleta) com
 * alfa, exatamente como `info` faz com `primary`. O claro fica intocado.
 */
const TONE: Record<AlertTone, { box: string; icon: string; symbol: string }> = {
  info: { box: 'border-primary/25 bg-primary/5', icon: 'text-primary', symbol: 'info' },
  warning: {
    box: 'border-[#FEEFC3] bg-[#FEF7E0] dark:border-tertiary/30 dark:bg-tertiary/10',
    icon: 'text-[#B06000] dark:text-tertiary',
    symbol: 'warning',
  },
  error: { box: 'border-error/25 bg-error-container/60', icon: 'text-error', symbol: 'error' },
}

export function Alert({ children, title, tone = 'info', className }: {
  children: ReactNode
  title?: string
  tone?: AlertTone
  className?: string
}) {
  const appearance = TONE[tone]
  return (
    <div className={cn('flex items-start gap-3 rounded-xs border px-3 py-2.5', appearance.box, className)}>
      <Icon name={appearance.symbol} filled className={cn('mt-0.5 shrink-0 text-[19px]', appearance.icon)} />
      <div className="min-w-0 font-body-sm text-body-sm text-on-surface-variant">
        {title && <p className="font-bold text-on-surface">{title}</p>}
        {children}
      </div>
    </div>
  )
}
