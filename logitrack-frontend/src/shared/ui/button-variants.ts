import { cn } from '@/shared/lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary shadow-sm hover:bg-primary-container hover:text-on-primary-container',
  secondary: 'bg-surface text-on-surface border border-outline-variant hover:bg-surface-container-low',
  danger: 'bg-error-container text-on-error-container border border-error-container hover:bg-error/10',
  ghost: 'text-primary hover:bg-surface-container-low',
}

const SIZE: Record<ButtonSize, string> = {
  sm: 'px-3 py-2',
  md: 'px-4 py-2',
  lg: 'h-10 px-4',
}

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-xs font-body-sm text-body-sm font-medium transition-colors ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ' +
  'disabled:opacity-50 disabled:pointer-events-none'

/**
 * Fora de `button.tsx` para nao quebrar Fast Refresh: um arquivo de componente
 * que tambem exporta funcoes puras perde hot reload.
 *
 * Serve tanto ao `<Button>` quanto a `<Link>` estilizado como botao.
 */
export function buttonClassName(variant: ButtonVariant = 'secondary', size: ButtonSize = 'md', className?: string) {
  return cn(BASE, VARIANT[variant], SIZE[size], className)
}
