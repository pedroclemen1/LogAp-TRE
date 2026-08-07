import { toSpreadsheetXml } from '@/shared/lib/export-serialization'
import type { FleetVehicleDto } from '../api/fleet-dto'

export function toFleetXls(
  vehicles: readonly FleetVehicleDto[],
  columns: readonly string[],
  sheetName: string,
): string {
  return toSpreadsheetXml(
    columns,
    vehicles.map((vehicle) => [
      vehicle.id,
      vehicle.placa,
      vehicle.modelo,
      vehicle.tipo,
      vehicle.ano,
      vehicle.kmInicial,
      vehicle.odometroKm,
      vehicle.status,
      vehicle.ultimaViagemEm,
      vehicle.proximaManutencaoEm,
      vehicle.manutencaoAtrasada,
    ]),
    sheetName,
  )
}
