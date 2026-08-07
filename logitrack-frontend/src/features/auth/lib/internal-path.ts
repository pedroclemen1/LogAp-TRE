/**
 * Sanitiza o `?from=` do login antes de navegar.
 *
 * Aceita apenas caminhos internos. Rejeita:
 *   - URL absoluta (`https://evil.com`, `javascript:...`)
 *   - protocol-relative (`//evil.com`)
 *   - `/\evil.com`, que alguns navegadores normalizam para `//`
 *   - qualquer coisa que nao comece com `/`
 */
const DEFAULT_REDIRECT = '/'

export function sanitizeInternalPath(value: string | null | undefined): string {
  if (!value || !value.startsWith('/')) return DEFAULT_REDIRECT
  if (value.startsWith('//') || value.startsWith('/\\')) return DEFAULT_REDIRECT
  return value
}
