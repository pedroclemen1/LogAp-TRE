/**
 * Traducao entre o numero de pagina da URL e o da API.
 *
 * A URL e 1-based (`/frota?page=2` e a segunda pagina, como o usuario le) e o
 * Spring Data e 0-based. Concentrar a conversao aqui evita `page - 1`
 * espalhado pelas telas, que e onde esse tipo de erro costuma aparecer.
 *
 * O caminho inverso nao mora aqui: cada tela monta o proprio href porque
 * precisa preservar os filtros que so ela conhece.
 */

/** `?page=` -> indice 0-based para a API. Valor ausente ou invalido vira 0. */
export function parsePageParam(value: string | undefined): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 1 ? parsed - 1 : 0
}
