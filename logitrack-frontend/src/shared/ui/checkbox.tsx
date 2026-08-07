import type { InputHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  /** Obrigatorio: as checkboxes de tabela nao tem <label> visivel. */
  'aria-label': string
}

export function Checkbox({ className, ...props }: CheckboxProps) {
  return (
    <input
      type="checkbox"
      className={cn('rounded-xs border-outline-variant text-primary focus:ring-primary', className)}
      {...props}
    />
  )
}
