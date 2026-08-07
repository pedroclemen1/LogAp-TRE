/**
 * Contrato do formulario de cadastro de veiculo.
 *
 * Mora aqui, e nao em `actions.ts`, por uma restricao do Next: um modulo
 * marcado com `'use server'` so pode exportar funcoes async. Exportar uma
 * constante junto derruba a aplicacao com "A 'use server' file can only export
 * async functions, found object."
 *
 * Os nomes dos campos sao os da API (`placa`, `kmInicial`...), nao os do
 * dominio do frontend. Assim o mapa `campos` que o backend devolve no HTTP 400
 * casa direto com o `name` de cada input, sem tabela de traducao no meio.
 */
const VEHICLE_FORM_FIELDS = ['placa', 'modelo', 'tipo', 'ano', 'kmInicial'] as const

export type VehicleFormField = (typeof VEHICLE_FORM_FIELDS)[number]

export type VehicleFormState = {
  status: 'idle' | 'success' | 'error'
  /** Erro geral: placa duplicada, API fora do ar. */
  message?: string
  fieldErrors?: Partial<Record<VehicleFormField, string>>
  /** Devolvido no erro para o formulario nao perder o que foi digitado. */
  values?: Partial<Record<VehicleFormField, string>>
}

export type FleetDeleteState =
  | { status: 'success' }
  | { status: 'error'; message: string }
