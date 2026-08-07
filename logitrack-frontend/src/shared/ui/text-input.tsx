import type { InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import { Icon } from './icon'

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  /** Glifo decorativo a esquerda. O padding do input fica com o chamador. */
  leadingIcon?: string
  leadingIconClassName?: string
  /** Glifo decorativo a direita (nao interativo). */
  trailingIcon?: string
  trailingIconClassName?: string
  /** Slot interativo a direita, ex: botao de mostrar senha. */
  trailing?: ReactNode
  wrapperClassName?: string
}

/**
 * O que esta compartilhado aqui e o posicionamento do icone sobre o campo —
 * repetido 10+ vezes no projeto. O estilo do proprio input continua vindo por
 * `className`, porque as telas usam densidades e superficies diferentes de
 * propositio (h-36px na frota, h-compact-row-height no login).
 */
export function TextInput({
  leadingIcon,
  leadingIconClassName = 'text-[20px]',
  trailingIcon,
  trailingIconClassName = 'text-[20px]',
  trailing,
  wrapperClassName,
  className,
  ...props
}: TextInputProps) {
  return (
    <div className={cn('relative flex items-center', wrapperClassName)}>
      {leadingIcon && (
        <Icon
          name={leadingIcon}
          className={cn(
            'absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none',
            leadingIconClassName,
          )}
        />
      )}
      <input className={className} {...props} />
      {trailingIcon && (
        <Icon
          name={trailingIcon}
          className={cn(
            'absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none',
            trailingIconClassName,
          )}
        />
      )}
      {trailing && <span className="absolute right-3 flex items-center">{trailing}</span>}
    </div>
  )
}
