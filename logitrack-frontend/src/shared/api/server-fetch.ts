import 'server-only'

import { cookies } from 'next/headers'
import { getLocale, getTranslations } from 'next-intl/server'
import { getApiBaseUrl, getApiRequestTimeoutMs } from '@/shared/config/env'
import { SESSION_COOKIE } from '@/shared/config/session'
import { ApiRequestError, NotFoundError, UnauthorizedError, type ApiErrorBody } from './api-error'
import { resolveApiError } from './api-error-localization'

type FetchOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  searchParams?: URLSearchParams
}

async function authorizationHeader(): Promise<Record<string, string>> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function toError(response: Response, path: string): Promise<ApiRequestError> {
  // O corpo pode nao ser JSON (proxy intermediario, 502 de gateway...).
  let body: Partial<ApiErrorBody> = {}
  try {
    body = (await response.json()) as Partial<ApiErrorBody>
  } catch {
    body = {}
  }

  const t = await getTranslations('ApiErrors')
  const locale = await getLocale()
  const resolved = body.message ? resolveApiError(body.message) : undefined
  let message: string
  if (resolved) message = t(resolved.key, resolved.values)
  else if (!body.message) message = t('httpFailure', { path, status: response.status })
  else if (locale === 'pt-BR') message = body.message
  else message = t('unknown')

  const fieldErrors = body.campos
    ? Object.fromEntries(Object.entries(body.campos).map(([field, fieldMessage]) => {
        const fieldResolution = resolveApiError(fieldMessage)
        let localizedMessage: string
        if (fieldResolution) localizedMessage = t(fieldResolution.key, fieldResolution.values)
        else localizedMessage = locale === 'pt-BR' ? fieldMessage : t('invalidField')
        return [field, localizedMessage]
      }))
    : undefined

  if (response.status === 401) return new UnauthorizedError(message)
  if (response.status === 404) return new NotFoundError(message)
  return new ApiRequestError(response.status, message, fieldErrors)
}

async function request<T>(path: string, options: FetchOptions, authenticated: boolean): Promise<T> {
  const { method = 'GET', body, searchParams } = options
  const query = searchParams?.toString()
  const url = `${getApiBaseUrl()}${path}${query ? `?${query}` : ''}`

  const response = await fetch(url, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(authenticated ? await authorizationHeader() : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(getApiRequestTimeoutMs()),
  })

  if (!response.ok) {
    throw await toError(response, path)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  return request<T>(path, options, true)
}

export async function apiFetchPublic<T>(path: string, options: FetchOptions = {}): Promise<T> {
  return request<T>(path, options, false)
}
