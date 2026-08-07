import type { HTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'

/**
 * "Level 1" do design system: superficie com borda de 1px e sem sombra.
 * O DESIGN.md do Stitch define hierarquia por borda/tonalidade, nao por sombra.
 */
export function Surface({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('bg-surface border border-outline-variant rounded-xs', className)} {...props} />
}
