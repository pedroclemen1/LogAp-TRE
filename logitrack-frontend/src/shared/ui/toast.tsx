'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useTranslations } from 'next-intl'
import { Icon } from './icon'
import { IconButton } from './icon-button'
import { ToastContext, useToast, type ToastInput, type ToastTone } from './use-toast'

type ToastItem = ToastInput & { id: number; tone: ToastTone }

const APPEARANCE: Record<ToastTone, { icon: string; border: string; iconTone: string }> = {
  success: { icon: 'check_circle', border: 'border-l-[#137333]', iconTone: 'text-[#137333]' },
  error: { icon: 'error', border: 'border-l-error', iconTone: 'text-error' },
  warning: { icon: 'warning', border: 'border-l-[#B06000]', iconTone: 'text-[#B06000]' },
  info: { icon: 'info', border: 'border-l-primary', iconTone: 'text-primary' },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const t = useTranslations('Common')
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(1)
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())
  const viewport = useRef<HTMLDivElement>(null)

  const dismissToast = useCallback((id: number) => {
    const timer = timers.current.get(id)
    if (timer) clearTimeout(timer)
    timers.current.delete(id)
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback((input: ToastInput) => {
    const id = nextId.current++
    const tone = input.tone ?? 'info'
    const duration = input.duration ?? (tone === 'error' ? 7000 : 4500)
    setToasts((current) => [...current.slice(-3), { ...input, id, tone }])
    timers.current.set(id, setTimeout(() => dismissToast(id), duration))
    return id
  }, [dismissToast])

  useEffect(() => () => {
    timers.current.forEach(clearTimeout)
    timers.current.clear()
  }, [])

  useEffect(() => {
    const element = viewport.current
    if (!element || typeof element.showPopover !== 'function') return
    const open = element.matches(':popover-open')
    if (toasts.length > 0 && !open) element.showPopover()
    if (toasts.length === 0 && open) element.hidePopover()
  }, [toasts.length])

  const value = useMemo(() => ({ showToast, dismissToast }), [dismissToast, showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        ref={viewport}
        popover="manual"
        aria-label={t('notifications')}
        className="pointer-events-none fixed bottom-auto left-4 right-4 top-4 z-[100] m-0 flex max-h-[calc(100vh-2rem)] flex-col items-end gap-2 overflow-visible border-0 bg-transparent p-0 sm:left-auto sm:w-[390px]"
      >
        {toasts.map((toast) => {
          const appearance = APPEARANCE[toast.tone]
          return (
            <div
              key={toast.id}
              role={toast.tone === 'error' ? 'alert' : 'status'}
              className={`pointer-events-auto flex w-full items-start gap-3 rounded-xs border border-l-4 border-outline-variant bg-surface-container-lowest p-3 shadow-lg ${appearance.border}`}
            >
              <Icon name={appearance.icon} filled className={`mt-0.5 shrink-0 text-[21px] ${appearance.iconTone}`} />
              <div className="min-w-0 flex-1">
                <p className="font-body-sm text-body-sm font-bold text-on-surface">{toast.title}</p>
                {toast.description && (
                  <p className="mt-0.5 break-words font-body-sm text-body-sm text-on-surface-variant">
                    {toast.description}
                  </p>
                )}
              </div>
              <IconButton
                aria-label={t('closeNotification')}
                icon="close"
                iconClassName="text-[18px]"
                className="h-7 w-7 shrink-0"
                onClick={() => dismissToast(toast.id)}
              />
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function ToastOnMount({ toast, clearPath }: { toast: ToastInput; clearPath?: string }) {
  const { showToast } = useToast()
  const shown = useRef(false)

  useEffect(() => {
    if (shown.current) return
    shown.current = true
    showToast(toast)
    if (clearPath) window.history.replaceState(window.history.state, '', clearPath)
  }, [clearPath, showToast, toast])

  return null
}
