package br.com.logap.logitrack.manifest;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.logap.logitrack.manifest.dto.ManifestCandidateResponse;
import br.com.logap.logitrack.manifest.dto.ManifestResponse;
import br.com.logap.logitrack.manifest.dto.ManifestStageResponse;
import br.com.logap.logitrack.manifest.dto.ManifestSummaryResponse;
import br.com.logap.logitrack.manifest.projection.StageManifestView;
import br.com.logap.logitrack.shared.ResourceNotFoundException;
import br.com.logap.logitrack.shared.SearchPattern;
import br.com.logap.logitrack.trip.Trip;
import br.com.logap.logitrack.trip.TripRepository;
import br.com.logap.logitrack.trip.TripStage;
import br.com.logap.logitrack.trip.TripStageRepository;
import br.com.logap.logitrack.trip.TripStatus;

@Service
@Transactional(readOnly = true)
public class ManifestQueryService {

    private final ManifestRepository repository;
    private final TripRepository tripRepository;
    private final TripStageRepository stageRepository;

    public ManifestQueryService(ManifestRepository repository,
                                TripRepository tripRepository,
                                TripStageRepository stageRepository) {
        this.repository = repository;
        this.tripRepository = tripRepository;
        this.stageRepository = stageRepository;
    }

    public Page<ManifestCandidateResponse> listCandidates(String busca, Integer veiculoId,
                                                           TripStatus status, Pageable pageable) {
        Page<Trip> page = tripRepository.findFiltered(
            SearchPattern.contains(busca), veiculoId, status == null ? null : status.name(), pageable);
        List<Trip> trips = page.getContent();
        if (trips.isEmpty()) {
            return new PageImpl<>(List.of(), pageable, page.getTotalElements());
        }

        Map<Integer, List<TripStage>> stagesByTrip = loadStages(trips);
        Map<Integer, Integer> manifestIdsByStage = loadManifestIdsByStage(stagesByTrip);

        List<ManifestCandidateResponse> content = trips.stream()
            .map(trip -> toCandidateResponse(
                trip,
                stagesByTrip.getOrDefault(trip.getId(), List.of()),
                manifestIdsByStage))
            .toList();

        return new PageImpl<>(content, pageable, page.getTotalElements());
    }

    public Page<ManifestSummaryResponse> list(String busca, Pageable pageable) {
        Pageable unsorted = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
        Page<Integer> ids = repository.findFilteredIds(SearchPattern.contains(busca), unsorted);
        return new PageImpl<>(loadOrdered(ids.getContent()), unsorted, ids.getTotalElements());
    }

    public ManifestResponse findById(Integer id) {
        return ManifestResponse.from(repository.findByIdWithItems(id)
            .orElseThrow(() -> new ResourceNotFoundException("Romaneio", id)));
    }

    public ManifestResponse findByStage(Integer stageId) {
        return ManifestResponse.from(repository.findByEtapaIdWithItems(stageId)
            .orElseThrow(() -> new ResourceNotFoundException("Romaneio do trecho", stageId)));
    }

    private static ManifestCandidateResponse toCandidateResponse(
            Trip trip, List<TripStage> stages, Map<Integer, Integer> manifestIdsByStage) {
        return new ManifestCandidateResponse(
            trip.getId(),
            trip.getDataSaida(),
            trip.getOrigem(),
            trip.getDestino(),
            trip.getVeiculo().getPlaca(),
            trip.getVeiculo().getModelo(),
            trip.getMotorista() == null ? null : trip.getMotorista().getNome(),
            trip.getMotorista() == null ? null : trip.getMotorista().getCnh(),
            trip.getStatus(),
            toStageResponses(trip, stages, manifestIdsByStage));
    }

    private static List<ManifestStageResponse> toStageResponses(
            Trip trip, List<TripStage> stages, Map<Integer, Integer> manifestIdsByStage) {
        List<ManifestStageResponse> responses = new java.util.ArrayList<>(stages.size());
        for (int index = 0; index < stages.size(); index++) {
            TripStage stage = stages.get(index);
            responses.add(new ManifestStageResponse(
                stage.getId(),
                stage.getOrdem(),
                stageOrigin(trip, stages, index),
                stage.getCidade(),
                stage.getKmTrecho(),
                stage.getCargaKg(),
                stage.getPrevistoEm(),
                stage.getRealizadoEm(),
                stage.concluido(),
                manifestIdsByStage.get(stage.getId())));
        }
        return responses;
    }

    private static String stageOrigin(Trip trip, List<TripStage> stages, int index) {
        return index == 0 ? trip.getOrigem() : stages.get(index - 1).getCidade();
    }

    private Map<Integer, List<TripStage>> loadStages(List<Trip> trips) {
        List<Integer> ids = trips.stream().map(Trip::getId).toList();
        return stageRepository.findByViagemIdInOrderByViagemIdAscOrdemAsc(ids).stream()
            .collect(Collectors.groupingBy(
                stage -> stage.getViagem().getId(), LinkedHashMap::new, Collectors.toList()));
    }

    private Map<Integer, Integer> loadManifestIdsByStage(
            Map<Integer, List<TripStage>> stagesByTrip) {
        List<Integer> stageIds = stagesByTrip.values().stream()
            .flatMap(List::stream)
            .map(TripStage::getId)
            .toList();
        if (stageIds.isEmpty()) {
            return Map.of();
        }
        return repository.findManifestIdsByEtapaIdIn(stageIds).stream()
            .collect(Collectors.toMap(StageManifestView::getEtapaId, StageManifestView::getRomaneioId));
    }

    private List<ManifestSummaryResponse> loadOrdered(List<Integer> ids) {
        if (ids.isEmpty()) {
            return List.of();
        }
        Map<Integer, Manifest> byId = repository.findAllWithItemsByIdIn(ids).stream()
            .collect(Collectors.toMap(
                Manifest::getId,
                Function.identity(),
                (first, ignored) -> first,
                LinkedHashMap::new));
        return ids.stream()
            .map(byId::get)
            .filter(java.util.Objects::nonNull)
            .map(ManifestSummaryResponse::from)
            .toList();
    }
}
