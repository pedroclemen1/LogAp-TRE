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
