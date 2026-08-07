'use client'

import { useCallback, useEffect, useState } from 'react'

const DARK_CLASS = 'dark'
const STORAGE_KEY = 'logitrack-theme'

/**
 * Unica abstracao de tema do projeto. O design do Stitch usa
 * `darkMode: "class"`, entao o tema vive na classe do <html>.
 *
 * O script curto do RootLayout aplica a preferencia antes da primeira pintura.
 * Este hook apenas sincroniza os controles e persiste mudancas posteriores.
 */
export function useTheme() {
  const [isDark, setIsDark] = useState<boolean | null>(null)

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains(DARK_CLASS))
  }, [])

  useEffect(() => {
    if (isDark === null) return
    document.documentElement.classList.toggle(DARK_CLASS, isDark)
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light'
    localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light')
  }, [isDark])

  const toggle = useCallback(() => {
    setIsDark((value) => !(value ?? document.documentElement.classList.contains(DARK_CLASS)))
  }, [])

  return { isDark: isDark ?? false, toggle }
}
