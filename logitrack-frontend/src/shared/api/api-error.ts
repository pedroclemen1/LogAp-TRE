/**
 * Espelho do `ApiError` do backend (shared/ApiError.java).
 *
 * `campos` so vem em falha de validacao (HTTP 400). O backend serializa com
 * `default-property-inclusion: non_null`, entao campos nulos SOMEM do JSON —
 * por isso `campos?` e opcional, nunca `| null`.
 */
export type ApiErrorBody = {
  timestamp: string
  status: number
  error: string
  code?: string
  message: string
  path: string
  campos?: Record<string, string>
}

/** Falha de uma chamada a API com resposta HTTP. */
export class ApiRequestError extends Error {
  readonly status: number
  readonly code?: string
  /** Erros por campo, quando o backend devolveu 400 de validacao. */
  readonly fieldErrors?: Record<string, string>

  constructor(status: number, message: string, fieldErrors?: Record<string, string>, code?: string) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.fieldErrors = fieldErrors
    this.code = code
  }
}

/**
 * 401: token ausente, invalido ou expirado.
 *
 * Separado do erro generico porque exige tratamento proprio — limpar a sessao
 * e mandar para o login, em vez de mostrar uma tela de erro.
 */
export class UnauthorizedError extends ApiRequestError {
  constructor(message = 'Sessão expirada.', code?: string) {
    super(401, message, undefined, code)
    this.name = 'UnauthorizedError'
  }
}

/** 404: usado pelas telas de detalhe para chamar `notFound()`. */
export class NotFoundError extends ApiRequestError {
  constructor(message = 'Recurso não encontrado.', code?: string) {
    super(404, message, undefined, code)
    this.name = 'NotFoundError'
  }
}
