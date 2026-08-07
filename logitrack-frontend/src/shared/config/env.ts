import 'server-only'

const DEVELOPMENT_API_URL = 'http://localhost:8080'
const DEFAULT_TIMEOUT_MS = 15_000

export function getApiBaseUrl(): string {
  const value = process.env.API_BASE_URL?.trim()
  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error('API_BASE_URL is required in production.')
  }

  const url = new URL(value || DEVELOPMENT_API_URL)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('API_BASE_URL must use http or https.')
  }

  return url.toString().replace(/\/+$/, '')
}

export function getApiRequestTimeoutMs(): number {
  const raw = process.env.API_REQUEST_TIMEOUT_MS?.trim()
  if (!raw) return DEFAULT_TIMEOUT_MS

  const timeout = Number(raw)
  if (!Number.isInteger(timeout) || timeout <= 0) {
    throw new Error('API_REQUEST_TIMEOUT_MS must be a positive integer.')
  }
  return timeout
}
