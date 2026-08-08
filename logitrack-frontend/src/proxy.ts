import { NextResponse, type NextRequest } from 'next/server'
import { PASSWORD_CHANGE_REQUIRED_COOKIE, SESSION_COOKIE } from './shared/config/session'

/**
 * Gate de navegacao: sem cookie de sessao, apenas login e ativacao de convite
 * ficam publicos. Com sessao, /login redireciona para o dashboard.
 *
 * A validade do JWT e a obrigacao real de trocar a senha sao julgadas pela API.
 * O marcador httpOnly de troca obrigatoria serve apenas para conduzir a
 * navegacao; verificar o token no edge duplicaria a regra e exigiria o segredo
 * aqui. Quando o token expira, `/api/auth/expirar` limpa os dois cookies antes
 * de voltar ao login, impedindo um laco de redirect.
 *
 * Importa apenas de `shared/config/session`, que e runtime-safe (sem
 * `document`, sem React), condicao para rodar no edge runtime.
 */
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE)
  const passwordChangeRequired = request.cookies.has(PASSWORD_CHANGE_REQUIRED_COOKIE)
  const { pathname, search } = request.nextUrl
  const isLoginRoute = pathname === '/login'
  const isInvitationRoute = pathname === '/convite'
  const isPublicRoute = isLoginRoute || isInvitationRoute
  const isPasswordChangeRoute = pathname === '/alterar-senha'

  if (!hasSession && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname + search)
    return NextResponse.redirect(loginUrl)
  }

  if (hasSession && isLoginRoute) {
    return NextResponse.redirect(new URL(passwordChangeRequired ? '/alterar-senha' : '/', request.url))
  }

  if (hasSession && passwordChangeRequired && !isPasswordChangeRoute && !isInvitationRoute) {
    return NextResponse.redirect(new URL('/alterar-senha', request.url))
  }

  return NextResponse.next()
}

export const config = {
  // Fora do gate: assets do Next, imagens em /public e a rota que
  // encerra a sessao (ela precisa rodar justamente quando o cookie esta ruim).
  matcher: ['/((?!_next/static|_next/image|img/|api/auth/expirar).*)'],
}
