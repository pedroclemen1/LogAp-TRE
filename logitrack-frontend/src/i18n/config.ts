export const SUPPORTED_LOCALES = ['pt-BR', 'en-US'] as const
export type AppLocale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: AppLocale = 'pt-BR'
export const LOCALE_COOKIE = 'logap_locale'

export function isAppLocale(value: string | undefined): value is AppLocale {
  return SUPPORTED_LOCALES.includes(value as AppLocale)
}
