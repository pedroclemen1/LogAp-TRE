import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import { Icon } from './icon'

type FieldProps = {
  /** Precisa casar com o `id` do controle para o <label> funcionar. */
  htmlFor: string
  label: string
  children: ReactNode
  /** Mensagem de erro. Quando presente, e anunciada via `role="alert"`. */
  error?: string
  /** Conteudo opcional a direita do label, ex: link "Forgot password?". */
  labelAside?: ReactNode
  className?: string
  labelClassName?: string
}

export function Field({
  htmlFor,
  label,
  children,
  error,
  labelAside,
  className,
  labelClassName = 'block font-body-sm text-body-sm text-on-surface mb-1',
}: FieldProps) {
  return (
    <div className={className}>
      {labelAside ? (
        <div className="flex justify-between items-baseline">
          <label htmlFor={htmlFor} className={labelClassName}>
            {label}
          </label>
          {labelAside}
        </div>
      ) : (
        <label htmlFor={htmlFor} className={labelClassName}>
          {label}
        </label>
      )}
      {children}
      {error && (
        <p role="alert" className="mt-1 font-body-sm text-body-sm text-error flex items-center gap-1">
          <Icon name="error" className="text-[16px]" /> {error}
        </p>
      )}
    </div>
  )
}

/** Titulo de secao dentro de um formulario longo. */
export function FieldsetLegend({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h3
      className={cn(
        'font-label-caps text-label-caps text-on-surface-variant uppercase border-b border-outline-variant pb-2',
        className,
      )}
    >
      {children}
    </h3>
  )
}
