package br.com.logap.logitrack.vehicle;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.logap.logitrack.shared.BusinessRuleException;
import br.com.logap.logitrack.shared.ResourceNotFoundException;
import br.com.logap.logitrack.shared.SearchPattern;
import br.com.logap.logitrack.vehicle.dto.FleetVehicleResponse;
import br.com.logap.logitrack.vehicle.dto.VehicleRequest;
import br.com.logap.logitrack.vehicle.dto.VehicleResponse;

@Service
@Transactional(readOnly = true)
public class VehicleService {

    private final VehicleRepository repository;

    public VehicleService(VehicleRepository repository) {
        this.repository = repository;
    }

    public List<VehicleResponse> listAll() {
        Set<Integer> vehiclesInUse = repository.findIdsInUse();
        Set<Integer> vehiclesInMaintenance = repository.findIdsInMaintenance();
        return repository.findAll(Sort.by("placa")).stream()
            .map(vehicle -> VehicleResponse.from(vehicle,
                vehiclesInMaintenance.contains(vehicle.getId())
                    ? VehicleOperationalStatus.MANUTENCAO
                    : vehiclesInUse.contains(vehicle.getId())
                        ? VehicleOperationalStatus.EM_USO
                        : VehicleOperationalStatus.DISPONIVEL))
            .toList();
    }

    /**
     * Frota com indicadores operacionais, para a tela de Veiculos.
     *
     * A ordenacao do cliente e descartada de proposito: a consulta e SQL
     * nativo com `ORDER BY placa` embutido, e o Spring Data concatenaria o Sort
     * recebido depois desse ORDER BY, produzindo SQL invalido. Ordenacao
     * configuravel exigiria montar a clausula na consulta — e um `sort` vindo
     * da URL direto no SQL seria injecao. Fica para quando houver requisito.
     */
    public Page<FleetVehicleResponse> listFleet(String busca, VehicleType tipo,
                                                VehicleOperationalStatus status, Pageable pageable) {
        Pageable unsorted = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());

        return repository
            .findFleetPage(SearchPattern.contains(busca), nameOrNull(tipo), nameOrNull(status), unsorted)
            .map(FleetVehicleResponse::from);
    }

    @Transactional
    public VehicleResponse create(VehicleRequest request) {
        String placa = normalizePlate(request.placa());
        validateUniquePlate(placa, null);

        Vehicle vehicle = new Vehicle(
            placa, request.modelo().trim(), request.tipo(), request.ano(), request.kmInicial());

        return VehicleResponse.from(repository.save(vehicle), VehicleOperationalStatus.DISPONIVEL);
    }

    @Transactional
    public VehicleResponse update(Integer id, VehicleRequest request) {
        Vehicle vehicle = getEntity(id);
        String placa = normalizePlate(request.placa());
        validateUniquePlate(placa, id);

        vehicle.atualizar(
            placa, request.modelo().trim(), request.tipo(), request.ano(), request.kmInicial());

        VehicleOperationalStatus status = repository.findIdsInMaintenance().contains(id)
            ? VehicleOperationalStatus.MANUTENCAO
            : repository.findIdsInUse().contains(id)
                ? VehicleOperationalStatus.EM_USO
                : VehicleOperationalStatus.DISPONIVEL;
        return VehicleResponse.from(vehicle, status);
    }

    @Transactional
    public void delete(Integer id) {
        deleteAll(List.of(id));
    }

    /** Exclusao atomica: se um selecionado for invalido, nenhum deles e apagado. */
    @Transactional
    public void deleteAll(List<Integer> requestedIds) {
        List<Integer> ids = List.copyOf(new LinkedHashSet<>(requestedIds));
        Set<Integer> foundIds = repository.findAllById(ids).stream()
            .map(Vehicle::getId)
            .collect(java.util.stream.Collectors.toSet());

        ids.stream()
            .filter(id -> !foundIds.contains(id))
            .findFirst()
            .ifPresent(id -> {
                throw new ResourceNotFoundException("Veiculo", id);
            });

        List<String> blockedPlates = repository.findPlatesWithHistory(ids);
        if (!blockedPlates.isEmpty()) {
            throw new BusinessRuleException(
                "Nao e possivel excluir veiculo com viagens ou manutencoes: %s."
                    .formatted(String.join(", ", blockedPlates)));
        }

        repository.deleteAllByIdInBatch(ids);
    }

    /** Usado pelos modulos de Viagem e Manutencao para resolver o vinculo. */
    public Vehicle getEntity(Integer id) {
        return repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Veiculo", id));
    }

    private void validateUniquePlate(String placa, Integer currentId) {
        // O banco ja rejeitaria pela constraint UNIQUE, mas com uma violacao de
        // integridade crua (500). Checar antes devolve 422 com mensagem util.
        repository.findByPlacaIgnoreCase(placa)
            .filter(existing -> !existing.getId().equals(currentId))
            .ifPresent(existing -> {
                throw new BusinessRuleException(
                    "Ja existe um veiculo cadastrado com a placa %s.".formatted(placa));
            });
    }

    private static String normalizePlate(String placa) {
        return placa.trim().toUpperCase();
    }

    private static String nameOrNull(Enum<?> value) {
        return value == null ? null : value.name();
    }
}
