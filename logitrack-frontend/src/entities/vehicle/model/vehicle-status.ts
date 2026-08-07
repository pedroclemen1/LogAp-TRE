/**
 * Estado operacional de um veiculo.
 *
 * Vive em `entities` porque duas features o consomem de verdade: `fleet`
 * (coluna Status da tabela) e `dashboard` (contadores "Em Uso / Disponivel /
 * Manutencao"). Nao ha rotulo aqui de propositio — o dashboard usa portugues
 * e a frota usa ingles maiusculo, herdado do design, entao a traducao pertence
 * a camada de UI de cada feature.
 */
export const VEHICLE_STATUSES = ['available', 'in_use', 'maintenance'] as const

export type VehicleStatus = (typeof VEHICLE_STATUSES)[number]
