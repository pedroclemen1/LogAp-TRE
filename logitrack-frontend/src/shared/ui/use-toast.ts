'use client'

import { createContext, useContext } from 'react'

export type ToastTone = 'success' | 'error' | 'warning' | 'info'

export type ToastInput = {
  title: string
  description?: string
  tone?: ToastTone
  duration?: number
}

type ToastContextValue = {
  showToast: (toast: ToastInput) => number
  dismissToast: (id: number) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider.')
  return context
}
