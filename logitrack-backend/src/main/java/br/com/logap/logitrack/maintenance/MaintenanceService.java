package br.com.logap.logitrack.maintenance;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.logap.logitrack.allocation.VehicleAllocationService;
import br.com.logap.logitrack.maintenance.catalog.MaintenanceServiceCatalogService;
import br.com.logap.logitrack.maintenance.catalog.MaintenanceServiceType;
import br.com.logap.logitrack.maintenance.dto.MaintenanceItemRequest;
import br.com.logap.logitrack.maintenance.dto.MaintenanceRequest;
import br.com.logap.logitrack.maintenance.dto.MaintenanceResponse;
import br.com.logap.logitrack.maintenance.dto.MaintenanceSummaryResponse;
import br.com.logap.logitrack.shared.BusinessRuleException;
import br.com.logap.logitrack.shared.ResourceNotFoundException;
import br.com.logap.logitrack.shared.SearchPattern;
import br.com.logap.logitrack.vehicle.Vehicle;
import br.com.logap.logitrack.vehicle.VehicleRepository;
import br.com.logap.logitrack.vehicle.VehicleService;

@Service
@Transactional(readOnly = true)
public class MaintenanceService {

    private final MaintenanceRepository repository;
    private final VehicleRepository vehicleRepository;
    private final VehicleService vehicleService;
    private final VehicleAllocationService allocationService;
    private final MaintenanceServiceCatalogService catalogService;
    private final Clock clock;

    public MaintenanceService(MaintenanceRepository repository,
                              VehicleRepository vehicleRepository,
                              VehicleService vehicleService,
                              VehicleAllocationService allocationService,
                              MaintenanceServiceCatalogService catalogService,
                              Clock clock) {
        this.repository = repository;
        this.vehicleRepository = vehicleRepository;
        this.vehicleService = vehicleService;
        this.allocationService = allocationService;
        this.catalogService = catalogService;
        this.clock = clock;
    }

    private LocalDate hoje() {
        return LocalDate.now(clock);
    }

    public Page<MaintenanceResponse> list(String busca, Integer veiculoId, MaintenanceStatus status,
                                          Boolean atrasada, LocalDate inicioDe, LocalDate inicioAte,
                                          MaintenanceOrder ordem, Pageable pageable) {
        if (inicioDe != null && inicioAte != null && inicioAte.isBefore(inicioDe)) {
            throw new BusinessRuleException("A data final do filtro nao pode ser anterior a inicial.");
        }
        MaintenanceOrder effectiveOrder = ordem == null ? MaintenanceOrder.DATA_ASC : ordem;
        Pageable unsorted = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
        Page<Integer> ids = repository.findFilteredIds(
            SearchPattern.contains(busca), veiculoId, status == null ? null : status.name(),
            atrasada, inicioDe, inicioAte, effectiveOrder.name(), unsorted);
        List<MaintenanceResponse> content = loadOrdered(ids.getContent());
        return new PageImpl<>(content, unsorted, ids.getTotalElements());
    }

    public MaintenanceResponse findById(Integer id) {
        return MaintenanceResponse.from(getWithDetails(id), hoje());
    }

    public MaintenanceSummaryResponse summary() {
        LocalDate monthStart = YearMonth.now(clock).atDay(1);
        LocalDate nextMonth = monthStart.plusMonths(1);
        List<Integer> agendaIds = repository.findAgendaIds(PageRequest.of(0, 5));
        return new MaintenanceSummaryResponse(
            vehicleRepository.count(),
            repository.countDistinctVehiclesByStatus(MaintenanceStatus.EM_REALIZACAO),
            repository.sumCostBetween(monthStart, nextMonth),
            repository.countByStatus(MaintenanceStatus.EM_REALIZACAO),
            repository.countOverdue(hoje()),
            loadOrdered(agendaIds));
    }

    @Transactional
    public MaintenanceResponse create(MaintenanceRequest request) {
        validateDates(request);
        validateUniqueServices(request.servicos());
        Vehicle vehicle = vehicleService.getEntity(request.veiculoId());
        allocationService.ensureAvailableForPlanning(vehicle.getId(), 0);

        Maintenance maintenance = new Maintenance(
            vehicle, request.dataInicioPrevista(), request.dataFinalizacaoPrevista());
        maintenance.substituirServicos(createItems(request.servicos()));
        repository.save(maintenance);
        repository.flush();
        return MaintenanceResponse.from(maintenance, hoje());
    }

    @Transactional
    public MaintenanceResponse update(Integer id, MaintenanceRequest request) {
        validateDates(request);
        validateUniqueServices(request.servicos());
        Maintenance maintenance = getWithDetails(id);
        maintenance.validarPodeAlterar();

        if (maintenance.getStatus() == MaintenanceStatus.EM_REALIZACAO) {
            updateInProgress(maintenance, request);
        } else {
            Vehicle vehicle = vehicleService.getEntity(request.veiculoId());
            allocationService.ensureAvailableForPlanning(vehicle.getId(), maintenance.getId());
            maintenance.atualizarPlanejamento(
                vehicle, request.dataInicioPrevista(), request.dataFinalizacaoPrevista());
            synchronizeItems(maintenance, request.servicos(), true);
        }

        repository.flush();
        return MaintenanceResponse.from(maintenance, hoje());
    }

    @Transactional
    public MaintenanceResponse start(Integer id) {
        Maintenance maintenance = getWithDetails(id);
        // Antes do lock, para o erro de estado continuar vencendo o de alocacao.
        maintenance.validarPodeIniciar();

        allocationService.reserveForMaintenance(maintenance.getVeiculo().getId(), maintenance.getId());
        maintenance.iniciar(LocalDateTime.now(clock));
        try {
            repository.flush();
        } catch (DataIntegrityViolationException exception) {
            String detail = exception.getMostSpecificCause().getMessage();
            if (detail != null && detail.contains("uk_manutencoes_em_realizacao_veiculo")) {
                throw new BusinessRuleException("O veiculo ja esta em manutencao.");
            }
            throw exception;
        }
        return MaintenanceResponse.from(maintenance, hoje());
    }

    @Transactional
    public MaintenanceResponse finish(Integer id) {
        Maintenance maintenance = getWithDetails(id);
        maintenance.concluir(LocalDateTime.now(clock));
        repository.flush();
        return MaintenanceResponse.from(maintenance, hoje());
    }

    @Transactional
    public void delete(Integer id) {
        Maintenance maintenance = repository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Manutencao", id));
        maintenance.validarPodeExcluir();
        repository.delete(maintenance);
    }

    private void updateInProgress(Maintenance maintenance, MaintenanceRequest request) {
        if (!maintenance.getVeiculo().getId().equals(request.veiculoId())) {
            throw new BusinessRuleException("O veiculo nao pode ser alterado durante a manutencao.");
        }
        if (!maintenance.getDataInicioPrevista().equals(request.dataInicioPrevista())) {
            throw new BusinessRuleException("A previsao de inicio nao pode ser alterada durante a manutencao.");
        }

        Set<Integer> existingIds = maintenance.getServicos().stream()
            .map(item -> item.getServicoCatalogo().getId())
            .collect(Collectors.toSet());
        Set<Integer> requestedIds = request.servicos().stream()
            .map(MaintenanceItemRequest::servicoId)
            .collect(Collectors.toSet());
        if (!existingIds.equals(requestedIds)) {
            throw new BusinessRuleException("Os servicos nao podem ser alterados durante a manutencao.");
        }

        maintenance.atualizarFinalizacaoPrevista(request.dataFinalizacaoPrevista());
        synchronizeItems(maintenance, request.servicos(), false);
    }

    private void synchronizeItems(Maintenance maintenance, List<MaintenanceItemRequest> requests,
                                  boolean allowNewItems) {
        Map<Integer, MaintenanceItem> existing = maintenance.getServicos().stream()
            .collect(Collectors.toMap(item -> item.getServicoCatalogo().getId(), Function.identity()));
        Set<Integer> newIds = requests.stream()
            .map(MaintenanceItemRequest::servicoId)
            .filter(id -> !existing.containsKey(id))
            .collect(Collectors.toCollection(LinkedHashSet::new));
        Map<Integer, MaintenanceServiceType> newTypes = allowNewItems
            ? catalogService.getActiveEntities(newIds)
            : Map.of();
        List<MaintenanceItem> synchronizedItems = new ArrayList<>();

        for (MaintenanceItemRequest request : requests) {
            MaintenanceItem item = existing.get(request.servicoId());
            if (item == null) {
                if (!allowNewItems) {
                    throw new BusinessRuleException("Os servicos nao podem ser alterados durante a manutencao.");
                }
                MaintenanceServiceType type = newTypes.get(request.servicoId());
                item = new MaintenanceItem(type, request.custo());
            } else {
                item.atualizarCusto(request.custo());
            }
            synchronizedItems.add(item);
        }
        maintenance.substituirServicos(synchronizedItems);
    }

    private List<MaintenanceItem> createItems(List<MaintenanceItemRequest> requests) {
        Set<Integer> ids = requests.stream()
            .map(MaintenanceItemRequest::servicoId)
            .collect(Collectors.toCollection(LinkedHashSet::new));
        Map<Integer, MaintenanceServiceType> types = catalogService.getActiveEntities(ids);
        return requests.stream()
            .map(request -> new MaintenanceItem(
                types.get(request.servicoId()), request.custo()))
            .toList();
    }

    private Maintenance getWithDetails(Integer id) {
        return repository.findByIdWithDetails(id)
            .orElseThrow(() -> new ResourceNotFoundException("Manutencao", id));
    }

    private List<MaintenanceResponse> loadOrdered(List<Integer> ids) {
        if (ids.isEmpty()) return List.of();
        Map<Integer, Maintenance> byId = repository.findAllWithDetailsByIdIn(ids).stream()
            .collect(Collectors.toMap(Maintenance::getId, Function.identity(), (a, b) -> a, LinkedHashMap::new));
        return ids.stream()
            .map(byId::get)
            .filter(java.util.Objects::nonNull)
            .map(maintenance -> MaintenanceResponse.from(maintenance, hoje()))
            .toList();
    }

    private static void validateDates(MaintenanceRequest request) {
        if (request.dataFinalizacaoPrevista().isBefore(request.dataInicioPrevista())) {
            throw new BusinessRuleException("A finalizacao prevista nao pode ser anterior ao inicio previsto.");
        }
    }

    private static void validateUniqueServices(List<MaintenanceItemRequest> services) {
        Set<Integer> ids = new HashSet<>();
        for (MaintenanceItemRequest service : services) {
            if (!ids.add(service.servicoId())) {
                throw new BusinessRuleException("O mesmo servico foi informado mais de uma vez.");
            }
        }
    }

}
