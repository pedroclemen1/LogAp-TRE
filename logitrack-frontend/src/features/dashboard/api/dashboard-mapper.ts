import type { VehicleStatus } from '@/entities/vehicle/model/vehicle-status'
import type {
  DashboardData,
  DashboardMaintenanceStatus,
  DashboardVehicle,
  DashboardVehicleKind,
  UtilizationEntry,
} from '../model/dashboard'
import type {
  DashboardDto,
  DashboardVehicleDto,
  MaintenanceStatusDto,
  VehicleOperationalStatusDto,
  VehicleTypeDto,
  VehicleUsageDto,
} from './dashboard-dto'

const VEHICLE_KIND: Record<VehicleTypeDto, DashboardVehicleKind> = {
  LEVE: 'light',
  PESADO: 'heavy',
}

const VEHICLE_STATUS: Record<VehicleOperationalStatusDto, VehicleStatus> = {
  DISPONIVEL: 'available',
  EM_USO: 'in_use',
  MANUTENCAO: 'maintenance',
}

const MAINTENANCE_STATUS: Record<MaintenanceStatusDto, DashboardMaintenanceStatus> = {
  PENDENTE: 'pending',
  EM_REALIZACAO: 'in_progress',
  CONCLUIDA: 'completed',
}

function toUsage(dto: VehicleUsageDto): UtilizationEntry {
  return {
    vehicleId: dto.id,
    vehiclePlate: dto.placa,
    vehicleModel: dto.modelo,
    kind: VEHICLE_KIND[dto.tipo],
    distanceKm: dto.kmAcumulado,
  }
}

export function toDashboard(dto: DashboardDto): DashboardData {
  return {
    totalDistanceKm: dto.totalKm,
    categoryVolumes: dto.volumePorCategoria.map((item) => ({
      kind: VEHICLE_KIND[item.tipo],
      tripCount: item.totalViagens,
      distanceKm: item.totalKm,
    })),
    upcomingMaintenance: dto.proximasManutencoes.map((item) => ({
      id: item.id,
      vehiclePlate: item.placa,
      vehicleModel: item.modelo,
      plannedStart: item.dataInicio,
      services: item.tipoServico,
      totalCost: item.custoEstimado,
      status: MAINTENANCE_STATUS[item.status],
    })),
    utilizationRanking: dto.rankingUtilizacao.map(toUsage),
    mostUsedVehicle: dto.veiculoMaisUtilizado ? toUsage(dto.veiculoMaisUtilizado) : undefined,
    currentMonthMaintenanceCost: dto.projecaoFinanceiraMesAtual,
    dailyDistance: dto.serieKmPorDia.map((item) => ({ date: item.data, distanceKm: item.totalKm })),
  }
}

export function toDashboardVehicle(dto: DashboardVehicleDto): DashboardVehicle {
  return { id: dto.id, kind: VEHICLE_KIND[dto.tipo], status: VEHICLE_STATUS[dto.statusOperacional] }
}
