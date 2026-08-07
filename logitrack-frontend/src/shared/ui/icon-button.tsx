import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'
import { Icon } from './icon'

type IconButtonVariant = 'plain' | 'outlined'

const VARIANT: Record<IconButtonVariant, string> = {
  plain: 'text-on-surface-variant hover:text-primary',
  outlined:
    'h-[36px] w-[36px] bg-surface-container-lowest border border-outline-variant text-on-surface-variant hover:bg-surface-container-low',
}

const BASE =
  'inline-flex items-center justify-center rounded-xs transition-colors ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ' +
  'disabled:opacity-50 disabled:pointer-events-none'

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  /** Obrigatorio: o botao nao tem texto visivel. */
  'aria-label': string
  icon: string
  iconClassName?: string
  variant?: IconButtonVariant
}

export function IconButton({
  icon,
  iconClassName,
  variant = 'plain',
  className,
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button type={type} className={cn(BASE, VARIANT[variant], className)} {...props}>
      <Icon name={icon} className={iconClassName} />
    </button>
  )
}
