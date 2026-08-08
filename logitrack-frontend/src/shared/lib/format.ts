import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type AppLocale } from '@/i18n/config'
import { parseLocalDate, splitLocalDateTime } from './date-string'

/**
 * Formatadores locale-aware da aplicação.
 *
 * Datas da API são valores de parede sem offset. Elas são montadas em UTC e
 * formatadas explicitamente em UTC para que a localização nunca desloque o
 * dia ou horário. A moeda continua BRL nos dois idiomas: idioma não altera o
 * domínio financeiro da aplicação.
 */
const currencyFormats = Object.fromEntries(SUPPORTED_LOCALES.map((locale) => [
  locale,
  new Intl.NumberFormat(locale, { style: 'currency', currency: 'BRL' }),
])) as Record<AppLocale, Intl.NumberFormat>
const integerFormats = Object.fromEntries(SUPPORTED_LOCALES.map((locale) => [
  locale,
  new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }),
])) as Record<AppLocale, Intl.NumberFormat>
const decimalFormats = Object.fromEntries(SUPPORTED_LOCALES.map((locale) => [
  locale,
  new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }),
])) as Record<AppLocale, Intl.NumberFormat>
const compactFormats = Object.fromEntries(SUPPORTED_LOCALES.map((locale) => [
  locale,
  new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }),
])) as Record<AppLocale, Intl.NumberFormat>
const dateFormats = Object.fromEntries(SUPPORTED_LOCALES.map((locale) => [
  locale,
  new Intl.DateTimeFormat(locale, { timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }),
])) as Record<AppLocale, Intl.DateTimeFormat>
const dateTimeFormats = Object.fromEntries(SUPPORTED_LOCALES.map((locale) => [
  locale,
  new Intl.DateTimeFormat(locale, { timeZone: 'UTC', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
])) as Record<AppLocale, Intl.DateTimeFormat>
const dayMonthFormats = Object.fromEntries(SUPPORTED_LOCALES.map((locale) => [
  locale,
  new Intl.DateTimeFormat(locale, { timeZone: 'UTC', month: 'short', day: '2-digit' }),
])) as Record<AppLocale, Intl.DateTimeFormat>

function localDateAsUtc(localDate: string): Date {
  const { year, month, day } = parseLocalDate(localDate)
  return new Date(Date.UTC(year, month - 1, day))
}

export function formatCurrency(value: number, locale: AppLocale = DEFAULT_LOCALE): string {
  return currencyFormats[locale].format(value)
}

/**
 * "12345678000195" -> "12.345.678/0001-95".
 *
 * O CNPJ e persistido como 14 digitos; a pontuacao pertence a exibicao. Um
 * valor que nao tenha exatamente 14 digitos e devolvido intacto em vez de
 * fatiado: registro gravado antes desta regra continua legivel, e um dado
 * inesperado aparece como esta em vez de virar texto mutilado.
 */
export function formatTaxId(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length !== 14) return value

  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}`
    + `/${digits.slice(8, 12)}-${digits.slice(12)}`
}

/** "145.280 km" (pt-BR) / "145,280 km" (en-US). */
export function formatKilometers(value: number, locale: AppLocale = DEFAULT_LOCALE): string {
  return `${decimalFormats[locale].format(value)} km`
}

export function formatDecimal(value: number, locale: AppLocale = DEFAULT_LOCALE): string {
  return decimalFormats[locale].format(value)
}

export function formatInteger(value: number, locale: AppLocale = DEFAULT_LOCALE): string {
  return integerFormats[locale].format(value)
}

export function formatCompact(value: number, locale: AppLocale = DEFAULT_LOCALE): string {
  return compactFormats[locale].format(value)
}

export function formatDate(localDate: string, locale: AppLocale = DEFAULT_LOCALE): string {
  return dateFormats[locale].format(localDateAsUtc(localDate))
}

export function formatDateTime(localDateTime: string, locale: AppLocale = DEFAULT_LOCALE): string {
  const { date, time } = splitLocalDateTime(localDateTime)
  const { year, month, day } = parseLocalDate(date)
  const [hour, minute] = time.split(':').map(Number)
  return dateTimeFormats[locale].format(new Date(Date.UTC(year, month - 1, day, hour, minute)))
}

function formatDayMonth(localDate: string, locale: AppLocale = DEFAULT_LOCALE): string {
  return dayMonthFormats[locale].format(localDateAsUtc(localDate)).replace('.', '')
}

export function formatDateRange(
  startLocalDate: string,
  endLocalDate?: string,
  locale: AppLocale = DEFAULT_LOCALE,
): string {
  const start = formatDayMonth(startLocalDate, locale)
  return endLocalDate ? `${start} – ${formatDayMonth(endLocalDate, locale)}` : start
}
