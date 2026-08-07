import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE } from '@/shared/config/session'

/**
 * Gate de navegacao: sem cookie de sessao, tudo cai em /login. Com sessao,
 * /login redireciona para o dashboard.
 *
 * Aqui so se verifica PRESENCA do cookie — a validade do JWT quem julga e a
 * API. Assinar/verificar o token no edge duplicaria a regra e exigiria o
 * segredo aqui. Quando o token esta presente mas expirado, o `apiFetch` recebe
 * 401 e manda para `/api/auth/expirar`, que apaga o cookie antes de voltar ao
 * login — e o que impede o laco de redirect.
 *
 * Importa apenas de `shared/config/session`, que e runtime-safe (sem
 * `document`, sem React), condicao para rodar no edge runtime.
 */
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE)
  const { pathname, search } = request.nextUrl
  const isLoginRoute = pathname === '/login'

  if (!hasSession && !isLoginRoute) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname + search)
    return NextResponse.redirect(loginUrl)
  }

  if (hasSession && isLoginRoute) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  // Fora do gate: assets do Next, imagens em /public e a rota que
  // encerra a sessao (ela precisa rodar justamente quando o cookie esta ruim).
  matcher: ['/((?!_next/static|_next/image|img/|api/auth/expirar).*)'],
}
