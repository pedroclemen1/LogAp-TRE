import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE } from '@/shared/config/session'
import { sanitizeInternalPath } from '@/features/auth/lib/internal-path'

/**
 * Encerra a sessao quando a API recusa o token (401) e devolve o usuario ao login.
 *
 * POR QUE UM ROUTE HANDLER E NAO UM REDIRECT DIRETO:
 * um Server Component nao pode apagar cookie. Se ele redirecionasse direto para
 * `/login`, o cookie expirado continuaria la, o `proxy` veria "tem sessao" e
 * mandaria de volta para `/` — laco infinito. Aqui o cookie e apagado ANTES do
 * redirect, entao o proxy ve a ausencia de sessao e deixa o login abrir.
 */
export function GET(request: NextRequest) {
  const from = sanitizeInternalPath(request.nextUrl.searchParams.get('from'))

  const loginUrl = new URL('/login', request.url)
  if (from !== '/') {
    loginUrl.searchParams.set('from', from)
  }
  loginUrl.searchParams.set('expirada', '1')

  const response = NextResponse.redirect(loginUrl)
  response.cookies.delete(SESSION_COOKIE)
  return response
}
