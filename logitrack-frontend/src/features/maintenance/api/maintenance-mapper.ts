import type {
  MaintenanceCatalogService,
  MaintenanceOrder,
  MaintenanceStatus,
  MaintenanceSummary,
  MaintenanceVehicleOption,
  MaintenanceVehicleStatus,
} from '../model/maintenance'
import type {
  MaintenanceCatalogServiceDto,
  MaintenanceDto,
  MaintenanceStatusDto,
  MaintenanceSummaryDto,
  MaintenanceVehicleDto,
  VehicleOperationalStatusDto,
} from './maintenance-dto'

const STATUS: Record<MaintenanceStatusDto, MaintenanceStatus> = {
  PENDENTE: 'pending',
  EM_REALIZACAO: 'in_progress',
  CONCLUIDA: 'completed',
}

export const STATUS_TO_DTO: Record<MaintenanceStatus, MaintenanceStatusDto> = {
  pending: 'PENDENTE',
  in_progress: 'EM_REALIZACAO',
  completed: 'CONCLUIDA',
}

const VEHICLE_STATUS: Record<VehicleOperationalStatusDto, MaintenanceVehicleStatus> = {
  DISPONIVEL: 'available',
  EM_USO: 'in_use',
  MANUTENCAO: 'maintenance',
}

export function toMaintenance(dto: MaintenanceDto): MaintenanceOrder {
  return {
    id: dto.id,
    vehicleId: dto.veiculoId,
    vehiclePlate: dto.veiculoPlaca,
    vehicleModel: dto.veiculoModelo,
    plannedStart: dto.dataInicioPrevista,
    plannedFinish: dto.dataFinalizacaoPrevista,
    startedAt: dto.iniciadaEm,
    completedAt: dto.concluidaEm,
    services: dto.servicos.map((service) => ({
      id: service.id,
      serviceId: service.servicoId,
      name: service.nome,
      cost: service.custo,
    })),
    totalCost: dto.custoTotal,
    status: STATUS[dto.status],
    overdue: dto.atrasada,
  }
}

export function toMaintenanceSummary(dto: MaintenanceSummaryDto): MaintenanceSummary {
  return {
    totalVehicles: dto.totalVeiculos,
    unavailableVehicles: dto.veiculosIndisponiveis,
    monthCost: dto.custoMesAtual,
    activeOrders: dto.ordensEmAndamento,
    overdueTasks: dto.tarefasAtrasadas,
    schedule: dto.agenda.map(toMaintenance),
  }
}

export function toMaintenanceVehicle(dto: MaintenanceVehicleDto): MaintenanceVehicleOption {
  return {
    id: dto.id,
    plate: dto.placa,
    model: dto.modelo,
    label: dto.descricao,
    status: VEHICLE_STATUS[dto.statusOperacional],
  }
}

export function toCatalogService(dto: MaintenanceCatalogServiceDto): MaintenanceCatalogService {
  return { id: dto.id, name: dto.nome, active: dto.ativo }
}

