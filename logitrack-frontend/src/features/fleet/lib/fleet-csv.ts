import type { FleetVehicleDto } from '../api/fleet-dto'
import { toCsv } from '@/shared/lib/export-serialization'

function decimal(value: number): string {
  return value.toFixed(2)
}

export function toFleetCsv(vehicles: readonly FleetVehicleDto[], columns: readonly string[]): string {
  return toCsv([
    columns,
    ...vehicles.map((vehicle) => [
      vehicle.id,
      vehicle.placa,
      vehicle.modelo,
      vehicle.tipo,
      vehicle.ano,
      decimal(vehicle.kmInicial),
      decimal(vehicle.odometroKm),
      vehicle.status,
      vehicle.ultimaViagemEm,
      vehicle.proximaManutencaoEm,
      vehicle.manutencaoAtrasada,
    ]),
  ])
}
