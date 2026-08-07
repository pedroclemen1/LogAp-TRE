import { STATUS_FROM_DTO } from '@/features/trips/api/trip-mapper'
import type { Manifest, ManifestCandidate, ManifestItem, ManifestStage } from '../model/manifest'
import type {
  ManifestCandidateDto,
  ManifestDto,
  ManifestItemDto,
  ManifestStageDto,
} from './manifest-dto'

function toItem(dto: ManifestItemDto): ManifestItem {
  return {
    id: dto.id,
    sequence: dto.sequencia,
    invoice: dto.notaFiscal,
    recipient: dto.destinatario,
    volumes: dto.volumes,
    weightKg: dto.pesoKg,
  }
}

export function toManifest(dto: ManifestDto): Manifest {
  return {
    id: dto.id,
    tripId: dto.viagemId,
    stageId: dto.viagemEtapaId,
    stageOrder: dto.trechoOrdem,
    number: dto.numero,
    issuedAt: dto.emitidoEm,
    issuedBy: dto.emitidoPor,
    authentication: dto.autenticacao,
    carrierName: dto.transportadoraRazaoSocial,
    carrierTaxId: dto.transportadoraCnpj,
    carrierRegistry: dto.transportadoraAntt,
    driverName: dto.motoristaNome,
    driverLicense: dto.motoristaCnh,
    vehiclePlate: dto.veiculoPlaca,
    vehicleDescription: dto.veiculoDescricao,
    originName: dto.origemNome,
    originAddress: dto.origemEndereco,
    destinationName: dto.destinoNome,
    destinationAddress: dto.destinoEndereco,
    distanceKm: dto.distanciaKm,
    items: dto.itens.map(toItem),
    totalVolumes: dto.totalVolumes,
    totalWeightKg: dto.totalPesoKg,
  }
}


function toStage(dto: ManifestStageDto): ManifestStage {
  return {
    stageId: dto.etapaId,
    order: dto.ordem,
    origin: dto.origem,
    destination: dto.destino,
    distanceKm: dto.kmTrecho,
    loadKg: dto.cargaKg,
    expectedAt: dto.previstoEm,
    arrivedAt: dto.realizadoEm,
    completed: dto.concluido,
    manifestId: dto.romaneioId,
  }
}

export function toManifestCandidate(dto: ManifestCandidateDto): ManifestCandidate {
  return {
    tripId: dto.viagemId,
    departureAt: dto.dataSaida,
    origin: dto.origem,
    destination: dto.destino,
    vehiclePlate: dto.veiculoPlaca,
    vehicleModel: dto.veiculoModelo,
    driverName: dto.motoristaNome,
    driverLicense: dto.motoristaCnh,
    status: STATUS_FROM_DTO[dto.status],
    stages: dto.trechos.map(toStage),
  }
}
