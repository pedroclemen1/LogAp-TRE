import type { VehicleStatus } from '@/entities/vehicle/model/vehicle-status'
import type { FleetVehicle, VehicleCategory } from '../model/vehicle'
import type { FleetVehicleDto, VehicleOperationalStatusDto, VehicleTypeDto } from './fleet-dto'

/**
 * O banco so conhece LEVE e PESADO — sao os dois valores da constraint CHECK em
 * `veiculos.tipo`, vinda do script do desafio. O design do Stitch previa uma
 * terceira categoria ("Cargo Van") que nao tem origem nenhuma, entao ela saiu
 * do modelo em vez de virar um valor que nunca aparece.
 */
const CATEGORY_BY_TYPE: Record<VehicleTypeDto, VehicleCategory> = {
  PESADO: 'heavy',
  LEVE: 'light',
}

const STATUS_BY_OPERATIONAL: Record<VehicleOperationalStatusDto, VehicleStatus> = {
  DISPONIVEL: 'available',
  EM_USO: 'in_use',
  MANUTENCAO: 'maintenance',
}

/** Sentido inverso: filtro escolhido na tela vira parametro da API. */
export const TYPE_BY_CATEGORY: Record<VehicleCategory, VehicleTypeDto> = {
  heavy: 'PESADO',
  light: 'LEVE',
}

export const OPERATIONAL_BY_STATUS: Record<VehicleStatus, VehicleOperationalStatusDto> = {
  available: 'DISPONIVEL',
  in_use: 'EM_USO',
  maintenance: 'MANUTENCAO',
}

export function toFleetVehicle(dto: FleetVehicleDto): FleetVehicle {
  return {
    id: dto.id,
    plate: dto.placa,
    model: dto.modelo,
    category: CATEGORY_BY_TYPE[dto.tipo],
    year: dto.ano,
    initialKm: dto.kmInicial,
    odometerKm: dto.odometroKm,
    status: STATUS_BY_OPERATIONAL[dto.status],
    lastTripAt: dto.ultimaViagemEm,
    nextMaintenance: dto.proximaManutencaoEm
      ? { scheduledFor: dto.proximaManutencaoEm, overdue: dto.manutencaoAtrasada }
      : undefined,
  }
}
