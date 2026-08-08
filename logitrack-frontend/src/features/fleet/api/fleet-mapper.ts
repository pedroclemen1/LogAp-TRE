import type { VehicleStatus } from '@/entities/vehicle/model/vehicle-status'
import type { FleetVehicle, VehicleCategory } from '../model/vehicle'
import type { FleetVehicleDto, VehicleOperationalStatusDto, VehicleTypeDto } from './fleet-dto'

const CATEGORY_BY_TYPE: Record<VehicleTypeDto, VehicleCategory> = {
  PESADO: 'heavy',
  LEVE: 'light',
}

const STATUS_BY_OPERATIONAL: Record<VehicleOperationalStatusDto, VehicleStatus> = {
  DISPONIVEL: 'available',
  EM_USO: 'in_use',
  MANUTENCAO: 'maintenance',
}

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
