/**
 * Espelho exato do JSON de `GET /api/veiculos/frota`.
 *
 * Nomes em portugues de proposito: este arquivo documenta o contrato da API
 * como ele e. A traducao para o vocabulario do frontend acontece no mapper —
 * ter os dois lados escritos torna a divergencia visivel em vez de silenciosa.
 *
 * CAMPOS OPCIONAIS, NAO NULOS: o backend usa
 * `jackson.default-property-inclusion: non_null`, entao valor ausente some do
 * JSON em vez de vir `null`. Por isso `campo?: T` e nunca `campo: T | null`.
 */

export type VehicleTypeDto = 'LEVE' | 'PESADO'

export type VehicleOperationalStatusDto = 'DISPONIVEL' | 'EM_USO' | 'MANUTENCAO'

export type FleetVehicleDto = {
  id: number
  placa: string
  modelo: string
  tipo: VehicleTypeDto
  ano?: number
  /** Hodometro informado no cadastro do veiculo. */
  kmInicial: number
  /** `kmInicial` mais a soma das viagens concluidas. Sempre presente. */
  odometroKm: number
  /** LocalDateTime sem offset; ausente se o veiculo nunca rodou. */
  ultimaViagemEm?: string
  /** LocalDate "YYYY-MM-DD"; ausente se nao ha manutencao em aberto. */
  proximaManutencaoEm?: string
  /** Primitivo no backend, entao vem sempre — inclusive como `false`. */
  manutencaoAtrasada: boolean
  status: VehicleOperationalStatusDto
}
