const MAINTENANCE_STATUSES = ['pending', 'in_progress', 'completed'] as const
export type MaintenanceStatus = (typeof MAINTENANCE_STATUSES)[number]

type AppliedMaintenanceService = {
  id: number
  serviceId: number
  name: string
  cost: number
}

export type MaintenanceOrder = {
  id: number
  vehicleId: number
  vehiclePlate: string
  vehicleModel: string
  plannedStart: string
  plannedFinish: string
  startedAt?: string
  completedAt?: string
  services: AppliedMaintenanceService[]
  totalCost: number
  status: MaintenanceStatus
  overdue: boolean
}

export type MaintenanceSummary = {
  totalVehicles: number
  unavailableVehicles: number
  monthCost: number
  activeOrders: number
  overdueTasks: number
  schedule: MaintenanceOrder[]
}

export type MaintenanceVehicleStatus = 'available' | 'in_use' | 'maintenance'

export type MaintenanceVehicleOption = {
  id: number
  plate: string
  model: string
  label: string
  status: MaintenanceVehicleStatus
}

export type MaintenanceCatalogService = {
  id: number
  name: string
  active: boolean
}

type MaintenanceItemInput = {
  id?: number
  servicoId: number
  custo: number
}

export type MaintenanceInput = {
  veiculoId: number
  dataInicioPrevista: string
  dataFinalizacaoPrevista: string
  servicos: MaintenanceItemInput[]
}

export type MaintenanceMutationState =
  | { status: 'success' }
  | { status: 'error'; message: string }

export type MaintenanceLoadState =
  | { status: 'success'; maintenance: MaintenanceOrder }
  | { status: 'error'; message: string }
