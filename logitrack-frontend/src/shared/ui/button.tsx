import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { buttonClassName, type ButtonSize, type ButtonVariant } from './button-variants'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  children: ReactNode
}

/**
 * `type` e explicitamente "button" por padrao: o default do HTML e "submit",
 * que dispara formularios sem querer.
 */
export function Button({ variant = 'secondary', size = 'md', className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={buttonClassName(variant, size, className)} {...props} />
}
