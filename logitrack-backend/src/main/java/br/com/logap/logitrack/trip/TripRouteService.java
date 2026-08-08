package br.com.logap.logitrack.trip;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import org.springframework.stereotype.Service;

import br.com.logap.logitrack.shared.BusinessDateWindow;
import br.com.logap.logitrack.shared.BusinessRuleException;
import br.com.logap.logitrack.trip.dto.TripStageRequest;
import br.com.logap.logitrack.trip.projection.TripRouteCityView;

/**
 * Mantem as regras e a persistencia da rota de uma viagem em um unico lugar.
 * A transacao continua pertencendo ao caso de uso exposto por {@link TripService}.
 */
@Service
class TripRouteService {

    private static final BigDecimal MAX_DECIMAL_10_2 = new BigDecimal("99999999.99");

    private final TripStageRepository repository;
    private final BusinessDateWindow dateWindow;

    TripRouteService(TripStageRepository repository, BusinessDateWindow dateWindow) {
        this.repository = repository;
        this.dateWindow = dateWindow;
    }

    Map<Integer, List<String>> loadRouteCities(List<Trip> trips) {
        if (trips.isEmpty()) return Map.of();

        List<Integer> ids = trips.stream().map(Trip::getId).toList();
        return repository.findRouteCities(ids).stream()
            .collect(Collectors.groupingBy(
                TripRouteCityView::getViagemId,
                LinkedHashMap::new,
                Collectors.mapping(TripRouteCityView::getCidade, Collectors.toList())));
    }

    List<TripStage> findStages(Integer tripId) {
        return repository.findByViagemIdOrderByOrdemAsc(tripId);
    }

    RouteSummary summarizeForCreation(LocalDateTime departure, List<TripStageRequest> requests) {
        RouteSummary summary = summarize(departure, requests);
        validateNewStages(requests);
        return summary;
    }

    RouteSummary summarize(LocalDateTime departure, List<TripStageRequest> requests) {
        BigDecimal totalKm = BigDecimal.ZERO;
        LocalDateTime previousExpected = departure;

        // Limite absoluto antes das regras relativas: sem ele, uma partida em
        // 9999 satisfaz "ordem crescente" e passa.
        dateWindow.validate(departure, "A data de saida");

        for (int index = 0; index < requests.size(); index++) {
            TripStageRequest stage = requests.get(index);
            totalKm = totalKm.add(stage.kmTrecho());

            if (stage.previstoEm() != null) {
                dateWindow.validate(stage.previstoEm(),
                    "A previsao do trecho %d".formatted(index + 1));
                if (stage.previstoEm().isBefore(departure)) {
                    throw new BusinessRuleException(
                        "A previsao do trecho %d nao pode ser anterior a partida.".formatted(index + 1));
                }
                if (previousExpected != null && stage.previstoEm().isBefore(previousExpected)) {
                    throw new BusinessRuleException("As previsoes dos trechos devem seguir a ordem da rota.");
                }
                previousExpected = stage.previstoEm();
            }
        }

        if (totalKm.compareTo(MAX_DECIMAL_10_2) > 0) {
            throw new BusinessRuleException("A quilometragem total da rota excede o limite permitido.");
        }

        TripStageRequest first = requests.getFirst();
        TripStageRequest last = requests.getLast();
        return new RouteSummary(
            last.destino().trim(), totalKm, first.cargaKg(), last.previstoEm());
    }

    void createStages(Trip trip, List<TripStageRequest> requests) {
        List<TripStage> stages = IntStream.range(0, requests.size())
            .mapToObj(index -> newStage(trip, requests.get(index), index))
            .toList();
        repository.saveAll(stages);
    }

    private static void validateNewStages(List<TripStageRequest> requests) {
        if (requests.stream().anyMatch(stage -> stage.id() != null)) {
            throw new BusinessRuleException("Trechos novos nao podem informar id.");
        }
    }

    void synchronizeStages(Trip trip, List<TripStageRequest> requests) {
        List<TripStage> existing = findStages(trip.getId());
        Map<Integer, TripStage> byId = existing.stream()
            .collect(Collectors.toMap(TripStage::getId, Function.identity()));
        Set<Integer> requestedIds = validateRequestedIds(requests, byId);

        moveToTemporaryPositions(existing);
        removeMissingStages(existing, requestedIds);

        for (int index = 0; index < requests.size(); index++) {
            TripStageRequest request = requests.get(index);
            TripStage stage = request.id() == null
                ? newStage(trip, request, index)
                : byId.get(request.id());
            stage.atualizarTrecho(
                (short) (index + 1), request.destino().trim(),
                request.kmTrecho(), request.cargaKg(), request.previstoEm());
            repository.save(stage);
        }
    }

    void completeRemainingStages(Integer tripId, LocalDateTime arrival) {
        List<TripStage> stages = findStages(tripId);
        if (stages.isEmpty()) {
            throw new BusinessRuleException("A viagem nao possui trechos para concluir.");
        }
        stages.stream()
            .filter(stage -> !stage.concluido())
            .forEach(stage -> stage.registrarRealizacao(arrival));
    }

    StageCompletion completeStage(Integer tripId, Integer stageId, LocalDateTime arrival) {
        List<TripStage> stages = findStages(tripId);
        int index = indexOfStage(stages, stageId);
        TripStage target = stages.get(index);

        if (target.concluido()) {
            throw new BusinessRuleException("Este trecho ja foi concluido.");
        }
        if (stages.subList(0, index).stream().anyMatch(stage -> !stage.concluido())) {
            throw new BusinessRuleException("Conclua os trechos na ordem da rota.");
        }

        target.registrarRealizacao(arrival);
        return new StageCompletion(target, index + 1, stages.size());
    }

    private static Set<Integer> validateRequestedIds(List<TripStageRequest> requests,
                                                     Map<Integer, TripStage> existingById) {
        Set<Integer> requestedIds = new HashSet<>();
        for (TripStageRequest request : requests) {
            if (request.id() == null) continue;
            if (!requestedIds.add(request.id())) {
                throw new BusinessRuleException("O mesmo trecho foi informado mais de uma vez.");
            }
            if (!existingById.containsKey(request.id())) {
                throw new BusinessRuleException(
                    "O trecho %d nao pertence a esta viagem.".formatted(request.id()));
            }
        }
        return requestedIds;
    }

    private void moveToTemporaryPositions(List<TripStage> existing) {
        // Libera as ordens positivas antes do flush para nao colidir com
        // UNIQUE (viagem_id, ordem) ao remover ou reordenar a rota.
        for (int index = 0; index < existing.size(); index++) {
            existing.get(index).prepararReordenacao((short) -(index + 1));
        }
        repository.flush();
    }

    private void removeMissingStages(List<TripStage> existing, Set<Integer> requestedIds) {
        List<TripStage> removed = existing.stream()
            .filter(stage -> !requestedIds.contains(stage.getId()))
            .toList();
        removed.stream()
            .filter(TripStage::concluido)
            .findFirst()
            .ifPresent(stage -> {
                throw new BusinessRuleException(
                    "O trecho %d ja foi concluido e nao pode ser removido.".formatted(stage.getId()));
            });
        if (!removed.isEmpty()) {
            repository.deleteAll(removed);
            repository.flush();
        }
    }

    private static TripStage newStage(Trip trip, TripStageRequest request, int index) {
        return new TripStage(
            trip, (short) (index + 1), request.destino().trim(),
            request.kmTrecho(), request.cargaKg(), request.previstoEm(), null);
    }

    private static int indexOfStage(List<TripStage> stages, Integer stageId) {
        for (int index = 0; index < stages.size(); index++) {
            if (stages.get(index).getId().equals(stageId)) return index;
        }
        throw new BusinessRuleException(
            "O trecho %d nao pertence a esta viagem.".formatted(stageId));
    }

    record RouteSummary(
        String destination,
        BigDecimal totalKm,
        BigDecimal initialLoad,
        LocalDateTime expectedArrival
    ) {
    }

    record StageCompletion(TripStage stage, int position, int totalStages) {

        boolean finalDestination() {
            return position == totalStages;
        }
    }
}
