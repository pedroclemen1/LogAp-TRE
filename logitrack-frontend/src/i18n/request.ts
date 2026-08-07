import { cookies } from 'next/headers'
import { getRequestConfig } from 'next-intl/server'
import { DEFAULT_LOCALE, isAppLocale, LOCALE_COOKIE } from './config'

export default getRequestConfig(async () => {
  const requestedLocale = (await cookies()).get(LOCALE_COOKIE)?.value
  const locale = isAppLocale(requestedLocale) ? requestedLocale : DEFAULT_LOCALE

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    timeZone: 'America/Sao_Paulo',
  }
})
