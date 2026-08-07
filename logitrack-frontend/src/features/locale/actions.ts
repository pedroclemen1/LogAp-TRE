'use server'

import { cookies } from 'next/headers'
import { isAppLocale, LOCALE_COOKIE } from '@/i18n/config'

export async function setLocaleAction(locale: string): Promise<void> {
  if (!isAppLocale(locale)) throw new Error('Unsupported locale.')

  const cookieStore = await cookies()
  cookieStore.set(LOCALE_COOKIE, locale, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
}
