import type { VehicleStatus } from '@/entities/vehicle/model/vehicle-status'

export type DashboardVehicleKind = 'light' | 'heavy'
export type DashboardMaintenanceStatus = 'pending' | 'in_progress' | 'completed'

export type DailyDistance = {
  date: string
  distanceKm: number
}

type CategoryVolume = {
  kind: DashboardVehicleKind
  tripCount: number
  distanceKm: number
}

type UpcomingMaintenance = {
  id: number
  vehiclePlate: string
  vehicleModel: string
  plannedStart: string
  services: string
  totalCost: number
  status: DashboardMaintenanceStatus
}

export type UtilizationEntry = {
  vehicleId: number
  vehiclePlate: string
  vehicleModel: string
  kind: DashboardVehicleKind
  distanceKm: number
}

export type DashboardData = {
  totalDistanceKm: number
  categoryVolumes: CategoryVolume[]
  upcomingMaintenance: UpcomingMaintenance[]
  utilizationRanking: UtilizationEntry[]
  mostUsedVehicle?: UtilizationEntry
  currentMonthMaintenanceCost: number
  dailyDistance: DailyDistance[]
}

export type DashboardVehicle = {
  id: number
  kind: DashboardVehicleKind
  status: VehicleStatus
}

export type FleetStatusCount = {
  status: VehicleStatus
  count: number
}

export type DistanceBucket = {
  id: string
  label: string
  distanceKm: number
  height: number
}
