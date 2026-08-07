/**
 * Envelope de paginacao do backend.
 *
 * Formato do `PagedModel` (o backend usa
 * `@EnableSpringDataWebSupport(pageSerializationMode = VIA_DTO)`), estavel e
 * documentado — diferente do `PageImpl` cru, que o proprio Spring Data avisa
 * nao ter garantia de estabilidade.
 */
export type PagedResponse<T> = {
  content: T[]
  page: {
    size: number
    number: number
    totalElements: number
    totalPages: number
  }
}

/**
 * Versao mapeada para o dominio, com o que as telas realmente usam.
 *
 * `firstItem`/`lastItem` sao numeros, nao frase pronta: o rodape de cada tabela
 * escreve a propria sentenca ("Showing 1 to 4 of 4 vehicles"), porque o texto
 * pertence a UI e varia de tela para tela. Camada de dados nao redige copy.
 */
export type Paged<T> = {
  items: T[]
  /** Indice 0-based, como o Spring Data devolve. */
  page: number
  size: number
  totalItems: number
  totalPages: number
  isFirst: boolean
  isLast: boolean
  /** Posicao 1-based do primeiro item da pagina; 0 quando nao ha nenhum. */
  firstItem: number
  /** Posicao 1-based do ultimo item da pagina; 0 quando nao ha nenhum. */
  lastItem: number
}

export function mapPaged<Dto, Domain>(
  response: PagedResponse<Dto>,
  mapItem: (dto: Dto) => Domain,
): Paged<Domain> {
  const { number, size, totalElements, totalPages } = response.page

  // Contados a partir do que a pagina REALMENTE trouxe, nao de `size`.
  // Derivar de `size` supoe pagina cheia e quebra fora do intervalo: pedir
  // ?page=2 com 4 registros produzia "21 a 4 de 4".
  const count = response.content.length
  const firstItem = count === 0 ? 0 : number * size + 1

  return {
    items: response.content.map(mapItem),
    page: number,
    size,
    totalItems: totalElements,
    totalPages,
    isFirst: number === 0,
    isLast: totalPages === 0 || number >= totalPages - 1,
    firstItem,
    lastItem: count === 0 ? 0 : firstItem + count - 1,
  }
}
