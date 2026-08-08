/**
 * Configuracao de transporte da sessao — nao e dominio.
 *
 * Vive em `shared` (e nao em `features/auth`) porque `shared/api` precisa ler o
 * cookie para montar o cabecalho Authorization, e `shared` nao pode importar
 * `features`. O nome do cookie esta na mesma categoria da URL base da API.
 *
 * Runtime-safe: sem `document`, sem React. Importavel pelo `src/proxy.ts`
 * (edge runtime), por Server Components e por Server Actions.
 */
export const SESSION_COOKIE = 'logap_session'

/**
 * Marcador de navegacao para contas que ainda precisam trocar a senha inicial.
 * A API continua sendo a autoridade e bloqueia as demais operacoes; este cookie
 * httpOnly apenas permite ao proxy conduzir o usuario direto para o formulario.
 */
export const PASSWORD_CHANGE_REQUIRED_COOKIE = 'logap_password_change_required'

/**
 * Identificador anonimo do navegador usado somente para isolar o rate limit de
 * login quando a chamada ao Spring parte do servidor Next.
 */
export const LOGIN_CLIENT_COOKIE = 'logap_login_client'
