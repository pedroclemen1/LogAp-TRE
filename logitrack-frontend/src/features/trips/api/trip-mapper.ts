import type {
  ChangeLogEntry,
  DriverOption,
  RouteStage,
  RouteStageState,
  Trip,
  TripDetails,
  TripStatus,
  VehicleKind,
  VehicleOption,
} from '../model/trip'
import type {
  DriverOptionDto,
  TripDetailsDto,
  TripDto,
  TripEventTypeDto,
  TripStatusDto,
  VehicleOptionDto,
  VehicleTypeDto,
} from './trip-dto'

/** Exportado: a feature de romaneio reusa a mesma traducao de status. */
export const STATUS_FROM_DTO: Record<TripStatusDto, TripStatus> = {
  PROGRAMADA: 'scheduled',
  EM_ANDAMENTO: 'in_progress',
  CONCLUIDA: 'completed',
  CANCELADA: 'canceled',
}

export const STATUS_TO_DTO: Record<TripStatus, TripStatusDto> = {
  scheduled: 'PROGRAMADA',
  in_progress: 'EM_ANDAMENTO',
  completed: 'CONCLUIDA',
  canceled: 'CANCELADA',
}

const KIND: Record<VehicleTypeDto, VehicleKind> = {
  PESADO: 'truck',
  LEVE: 'van',
}

const EVENT_KIND: Record<TripEventTypeDto, ChangeLogEntry['kind']> = {
  CRIADA: 'trip_created',
  INICIADA: 'trip_started',
  ROTA_ATUALIZADA: 'route_updated',
  CONCLUIDA: 'trip_completed',
  CANCELADA: 'trip_canceled',
  TRECHO_CONCLUIDO: 'stage_completed',
}

export function toTrip(dto: TripDto): Trip {
  return {
    id: dto.id,
    vehicleId: dto.veiculoId,
    vehiclePlate: dto.veiculoPlaca,
    vehicleModel: dto.veiculoModelo,
    vehicleKind: KIND[dto.veiculoTipo],
    driverId: dto.motoristaId,
    driverName: dto.motoristaNome,
    departureAt: dto.dataSaida,
    startedAt: dto.iniciadaEm,
    expectedArrivalAt: dto.dataChegadaPrevista,
    arrivalAt: dto.dataChegada,
    canceledAt: dto.canceladaEm,
    origin: dto.origem,
    destination: dto.destino,
    distanceKm: dto.kmPercorrida,
    loadKg: dto.cargaKg,
    status: STATUS_FROM_DTO[dto.status],
    routeCities: dto.rota,
  }
}

export function toVehicleOption(dto: VehicleOptionDto): VehicleOption {
  const operationalStatus = dto.statusOperacional === 'MANUTENCAO'
    ? 'maintenance'
    : dto.statusOperacional === 'EM_USO'
      ? 'in_use'
      : 'available'
  return {
    id: dto.id,
    plate: dto.placa,
    model: dto.modelo,
    kind: KIND[dto.tipo],
    label: dto.descricao,
    inUse: dto.emUso,
    operationalStatus,
  }
}

export function toDriverOption(dto: DriverOptionDto): DriverOption {
  return {
    id: dto.id,
    name: dto.nome,
    license: dto.cnh,
    phone: dto.telefone,
    inUse: dto.statusOperacional === 'EM_USO',
  }
}

function fallbackStages(trip: Trip): RouteStage[] {
  return [
    {
      id: -trip.id,
      city: trip.destination,
      expectedAt: trip.expectedArrivalAt,
      actualAt: trip.arrivalAt,
      role: 'destination',
      state: trip.status === 'completed' ? 'completed' : trip.status === 'canceled' ? 'canceled' : 'pending',
      distanceKm: trip.distanceKm,
      loadKg: trip.loadKg ?? 0,
    },
  ]
}

function stageState(trip: Trip, actualAt: string | undefined, index: number, firstIncompleteIndex: number): RouteStageState {
  if (actualAt || trip.status === 'completed') return 'completed'
  if (trip.status === 'canceled') return 'canceled'
  if (trip.status === 'in_progress' && index === firstIncompleteIndex) return 'active'
  return 'pending'
}

export function toTripDetails(dto: TripDetailsDto): TripDetails {
  const trip = toTrip(dto.viagem)
  const firstIncompleteIndex = dto.etapas.findIndex((stage) => !stage.realizadoEm)
  const stages = dto.etapas.length === 0
    ? fallbackStages(trip)
    : dto.etapas.map((stage, index): RouteStage => {
        const role: RouteStage['role'] = index === dto.etapas.length - 1 ? 'destination' : 'stop'
        return {
          id: stage.id,
          city: stage.cidade,
          expectedAt: stage.previstoEm,
          actualAt: stage.realizadoEm,
          role,
          state: stageState(trip, stage.realizadoEm, index, firstIncompleteIndex),
          distanceKm: stage.kmTrecho,
          loadKg: stage.cargaKg,
        }
      })

  return {
    trip,
    stages,
    events: dto.eventos.map((event) => ({
      id: event.id,
      kind: EVENT_KIND[event.tipo],
      title: event.titulo,
      detail: event.detalhe,
      author: event.autor,
      occurredAt: event.ocorridoEm,
    })),
  }
}
