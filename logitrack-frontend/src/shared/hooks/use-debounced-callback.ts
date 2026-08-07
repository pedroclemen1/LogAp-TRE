'use client'

import { useCallback, useEffect, useRef } from 'react'

export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs: number,
): (...args: Args) => void {
  const latestCallback = useRef(callback)
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    latestCallback.current = callback
  }, [callback])

  useEffect(() => () => clearTimeout(timeout.current), [])

  return useCallback((...args: Args) => {
    clearTimeout(timeout.current)
    timeout.current = setTimeout(() => latestCallback.current(...args), delayMs)
  }, [delayMs])
}
