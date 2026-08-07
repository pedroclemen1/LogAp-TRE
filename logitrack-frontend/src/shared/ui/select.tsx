import type { SelectHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'
import { Icon } from './icon'

type SelectOption = { value: string; label: string }

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> & {
  options: readonly SelectOption[]
  wrapperClassName?: string
}

const BASE =
  'appearance-none bg-none rounded-xs border border-outline-variant font-body-sm text-body-sm ' +
  'focus:outline-none focus:border-primary'

/**
 * `bg-none` remove a seta que o plugin @tailwindcss/forms injeta como
 * background-image, deixando apenas o glifo do Material.
 */
export function Select({ options, wrapperClassName, className, ...props }: SelectProps) {
  return (
    <div className={cn('relative', wrapperClassName)}>
      <select className={cn(BASE, 'pl-3 pr-8 py-2', className)} {...props}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Icon
        name="arrow_drop_down"
        className="absolute right-2 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant pointer-events-none"
      />
    </div>
  )
}
