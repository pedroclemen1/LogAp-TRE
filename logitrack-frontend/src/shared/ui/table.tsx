import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'

/**
 * Primitives composaveis. Deliberadamente NAO existe um `DataTable` dirigido
 * por config: as celulas destas telas tem conteudo muito especifico (rotas com
 * seta, badges, barras) e config-driven tornaria isso ilegivel.
 *
 * Cada primitive traz semantica + tipografia; o espacamento fica com a tela,
 * porque a densidade varia de propositio entre elas (px-3 na tabela compacta
 * do dashboard, px-4 nas tabelas de listagem).
 */

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return <table className={cn('w-full text-left border-collapse', className)} {...props} />
}

export function TableHeader({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={className} {...props} />
}

export function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={className} {...props} />
}

export function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={className} {...props} />
}

export function TableHead({ className, scope = 'col', ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope={scope}
      className={cn('font-label-caps text-label-caps text-on-surface-variant', className)}
      {...props}
    />
  )
}

export function TableCell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={className} {...props} />
}

/** Barra abaixo da tabela (contagem, paginacao). Fora do <table> por design. */
export function TableFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'border-t border-outline-variant bg-surface-container-lowest flex items-center justify-between',
        className,
      )}
      {...props}
    />
  )
}
