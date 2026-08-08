package br.com.logap.logitrack.trip;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.logap.logitrack.allocation.VehicleAllocationService;
import br.com.logap.logitrack.driver.Driver;
import br.com.logap.logitrack.driver.DriverRepository;
import br.com.logap.logitrack.shared.BusinessRuleException;
import br.com.logap.logitrack.shared.CurrentUserProvider;
import br.com.logap.logitrack.shared.ResourceNotFoundException;
import br.com.logap.logitrack.shared.SearchPattern;
import br.com.logap.logitrack.trip.dto.TripDetailsResponse;
import br.com.logap.logitrack.trip.dto.TripEventResponse;
import br.com.logap.logitrack.trip.dto.TripRequest;
import br.com.logap.logitrack.trip.dto.TripResponse;
import br.com.logap.logitrack.trip.dto.TripStageResponse;
import br.com.logap.logitrack.vehicle.Vehicle;
import br.com.logap.logitrack.vehicle.VehicleService;

@Service
@Transactional(readOnly = true)
public class TripService {

    private static final DateTimeFormatter EVENT_DATE_TIME = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private final TripRepository repository;
    private final TripRouteService routeService;
    private final TripEventRepository eventRepository;
    private final VehicleService vehicleService;
    private final VehicleAllocationService vehicleAllocationService;
    private final DriverRepository driverRepository;
    private final CurrentUserProvider currentUserProvider;
    private final Clock clock;

    public TripService(TripRepository repository,
                       TripRouteService routeService,
                       TripEventRepository eventRepository,
                       VehicleService vehicleService,
                       VehicleAllocationService vehicleAllocationService,
                       DriverRepository driverRepository,
                       CurrentUserProvider currentUserProvider,
                       Clock clock) {
        this.repository = repository;
        this.routeService = routeService;
        this.eventRepository = eventRepository;
        this.vehicleService = vehicleService;
        this.vehicleAllocationService = vehicleAllocationService;
        this.driverRepository = driverRepository;
        this.currentUserProvider = currentUserProvider;
        this.clock = clock;
    }

    public Page<TripResponse> list(String busca, Integer veiculoId, TripStatus status, Pageable pageable) {
        Page<Trip> page = repository.findFiltered(
            SearchPattern.contains(busca), veiculoId, status == null ? null : status.name(), pageable);
        Map<Integer, List<String>> rotas = routeService.loadRouteCities(page.getContent());
        return page.map(trip -> TripResponse.from(trip, rotas.getOrDefault(trip.getId(), List.of())));
    }

    public TripResponse findById(Integer id) {
        return TripResponse.from(findEntityWithRelations(id));
    }

    public TripDetailsResponse findDetails(Integer id) {
        Trip trip = findEntityWithRelations(id);
        List<TripStageResponse> stages = routeService.findStages(id).stream()
            .map(TripStageResponse::from)
            .toList();
        List<TripEventResponse> events = eventRepository.findByViagemIdOrderByOcorridoEmDesc(id).stream()
            .map(TripEventResponse::from)
            .toList();

        return new TripDetailsResponse(TripResponse.from(trip), stages, events);
    }

    @Transactional
    public TripResponse create(TripRequest request) {
        var route = routeService.summarizeForCreation(request.dataSaida(), request.trechos());

        Trip trip = new Trip(
            vehicleService.getEntity(request.veiculoId()),
            resolveDriver(request.motoristaId()),
            request.dataSaida(), route.expectedArrival(),
            request.origem().trim(), route.destination(),
            route.totalKm(), route.initialLoad());
        repository.save(trip);
        routeService.createStages(trip, request.trechos());

        appendEvent(trip, TripEventType.CRIADA, "Trip Created",
            "Route with %d segment(s), from %s to %s (%s km).".formatted(
                request.trechos().size(), trip.getOrigem(), trip.getDestino(), route.totalKm()));

        return TripResponse.from(trip);
    }

    @Transactional
    public TripResponse update(Integer id, TripRequest request) {
        var route = routeService.summarize(request.dataSaida(), request.trechos());
        Trip trip = repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Viagem", id));
        trip.validarPodeAlterar();
        Vehicle vehicle = vehicleService.getEntity(request.veiculoId());
        Driver driver = resolveDriver(request.motoristaId());
        if (trip.getStatus() == TripStatus.EM_ANDAMENTO) {
            if (driver == null) {
                throw new BusinessRuleException("Uma viagem em andamento deve possuir motorista.");
            }
            vehicleAllocationService.reserveForTrip(vehicle.getId(), trip.getId());
            validateDriverAllocation(driver.getId(), trip.getId());
        }

        routeService.synchronizeStages(trip, request.trechos());
        trip.atualizar(
            vehicle, driver,
            request.dataSaida(), route.expectedArrival(),
            request.origem().trim(), route.destination(),
            route.totalKm(), route.initialLoad());

        appendEvent(trip, TripEventType.ROTA_ATUALIZADA, "Trip Updated",
            "Route updated to %d segment(s) and %s km.".formatted(request.trechos().size(), route.totalKm()));
        if (trip.getStatus() == TripStatus.EM_ANDAMENTO) flushAllocation();

        return TripResponse.from(trip);
    }

    @Transactional
    public TripResponse start(Integer id) {
        Trip trip = repository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Viagem", id));
        // Antes do lock: erro de estado e mais especifico que erro de alocacao
        // e deve continuar vencendo. Ver o comentario em `Trip`.
        trip.validarPodeIniciar();

        vehicleAllocationService.reserveForTrip(trip.getVeiculo().getId(), trip.getId());
        validateDriverAllocation(trip.getMotorista().getId(), trip.getId());
        LocalDateTime now = LocalDateTime.now(clock);
        trip.iniciar(now);
        flushAllocation();
        appendEvent(trip, TripEventType.INICIADA, "Trip Started",
            "Departed %s at %s.".formatted(trip.getOrigem(), now.format(EVENT_DATE_TIME)));
        return TripResponse.from(trip);
    }

    @Transactional
    public TripResponse finish(Integer id) {
        Trip trip = repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Viagem", id));
        LocalDateTime now = LocalDateTime.now(clock);
        trip.concluir(now);
        routeService.completeRemainingStages(trip.getId(), now);
        appendEvent(trip, TripEventType.CONCLUIDA, "Trip Completed",
            "Arrived at %s. %s km added to the vehicle odometer.".formatted(
                trip.getDestino(), trip.getKmPercorrida()));
        return TripResponse.from(trip);
    }

    @Transactional
    public TripResponse cancel(Integer id) {
        Trip trip = repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Viagem", id));
        trip.cancelar(LocalDateTime.now(clock));
        appendEvent(trip, TripEventType.CANCELADA, "Trip Canceled",
            "Trip from %s to %s canceled without changing the odometer.".formatted(
                trip.getOrigem(), trip.getDestino()));
        return TripResponse.from(trip);
    }

    @Transactional
    public void delete(Integer id) {
        deleteAll(List.of(id));
    }

    /** Exclusao atomica; etapas e eventos acompanham a viagem pelo cascade do banco. */
    @Transactional
    public void deleteAll(List<Integer> requestedIds) {
        List<Integer> ids = List.copyOf(new LinkedHashSet<>(requestedIds));
        Set<Integer> found = repository.findAllById(ids).stream()
            .map(Trip::getId)
            .collect(Collectors.toSet());

        ids.stream()
            .filter(id -> !found.contains(id))
            .findFirst()
            .ifPresent(id -> {
                throw new ResourceNotFoundException("Viagem", id);
            });

        // Excluir uma viagem concluída reduziria o hodômetro histórico.
        List<Integer> completedIds = repository.findCompletedIds(ids);
        if (!completedIds.isEmpty()) {
            throw new BusinessRuleException(
                "Viagens concluidas nao podem ser excluidas: %s.".formatted(juntar(completedIds)));
        }

        List<Integer> activeIds = repository.findActiveIds(ids);
        if (!activeIds.isEmpty()) {
            throw new BusinessRuleException(
                "Cancele ou conclua as viagens em andamento antes de excluir: %s."
                    .formatted(juntar(activeIds)));
        }

        repository.deleteAllByIdInBatch(ids);
    }

    private static String juntar(List<Integer> ids) {
        return ids.stream().sorted().map(String::valueOf).collect(Collectors.joining(", "));
    }

    @Transactional
    public TripResponse completeStage(Integer tripId, Integer stageId) {
        Trip trip = repository.findById(tripId)
            .orElseThrow(() -> new ResourceNotFoundException("Viagem", tripId));
        if (trip.getStatus() != TripStatus.EM_ANDAMENTO) {
            throw new BusinessRuleException("Inicie a viagem antes de concluir um trecho.");
        }

        LocalDateTime now = LocalDateTime.now(clock);
        var completion = routeService.completeStage(tripId, stageId, now);
        appendEvent(trip, TripEventType.TRECHO_CONCLUIDO, "Stage Completed",
            "Arrived at %s (leg %d of %d).".formatted(
                completion.stage().getCidade(), completion.position(), completion.totalStages()));

        if (completion.finalDestination()) {
            trip.concluir(now);
            appendEvent(trip, TripEventType.CONCLUIDA, "Trip Completed",
                "Arrived at %s. %s km added to the vehicle odometer.".formatted(
                    trip.getDestino(), trip.getKmPercorrida()));
        }

        return TripResponse.from(trip);
    }

    private Trip findEntityWithRelations(Integer id) {
        return repository.findByIdWithRelations(id)
            .orElseThrow(() -> new ResourceNotFoundException("Viagem", id));
    }

    private Driver resolveDriver(Integer driverId) {
        if (driverId == null) return null;
        return driverRepository.findById(driverId)
            .filter(Driver::getAtivo)
            .orElseThrow(() -> new ResourceNotFoundException("Motorista ativo", driverId));
    }

    private void validateDriverAllocation(Integer driverId, Integer tripId) {
        if (driverId != null && repository.existsActiveDriver(driverId, tripId)) {
            throw new BusinessRuleException("O motorista ja esta em uma viagem em andamento.");
        }
    }

    private void flushAllocation() {
        try {
            repository.flush();
        } catch (DataIntegrityViolationException exception) {
            String detail = exception.getMostSpecificCause().getMessage();
            if (detail != null && detail.contains("uk_viagens_em_andamento_motorista")) {
                throw new BusinessRuleException("O motorista ja esta em uma viagem em andamento.");
            }
            if (detail != null && detail.contains("uk_viagens_em_andamento_veiculo")) {
                throw new BusinessRuleException("O veiculo ja esta em uma viagem em andamento.");
            }
            throw exception;
        }
    }

    private void appendEvent(Trip trip, TripEventType type, String title, String detail) {
        eventRepository.save(new TripEvent(
            trip, type, title, detail, currentUserProvider.currentUserName(), LocalDateTime.now(clock)));
    }
}
