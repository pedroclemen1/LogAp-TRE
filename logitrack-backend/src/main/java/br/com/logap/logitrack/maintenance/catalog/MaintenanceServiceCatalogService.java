package br.com.logap.logitrack.maintenance.catalog;

import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.logap.logitrack.shared.ActiveStatus;
import br.com.logap.logitrack.shared.BusinessRuleException;
import br.com.logap.logitrack.shared.ResourceNotFoundException;
import br.com.logap.logitrack.shared.SearchPattern;

@Service
@Transactional(readOnly = true)
public class MaintenanceServiceCatalogService {

    private final MaintenanceServiceTypeRepository repository;

    public MaintenanceServiceCatalogService(MaintenanceServiceTypeRepository repository) {
        this.repository = repository;
    }

    public List<MaintenanceServiceResponse> list(String search, ActiveStatus status) {
        ActiveStatus effectiveStatus = status == null ? ActiveStatus.ATIVO : status;
        return repository.findFiltered(SearchPattern.contains(search), effectiveStatus.name()).stream()
            .map(MaintenanceServiceResponse::from)
            .toList();
    }

    public MaintenanceServiceResponse findById(Integer id) {
        return MaintenanceServiceResponse.from(getEntity(id));
    }

    @Transactional
    public MaintenanceServiceResponse create(MaintenanceServiceRequest request) {
        String name = request.nome().trim();
        validateUniqueName(name, null);
        return MaintenanceServiceResponse.from(repository.save(new MaintenanceServiceType(name)));
    }

    @Transactional
    public MaintenanceServiceResponse update(Integer id, MaintenanceServiceRequest request) {
        MaintenanceServiceType service = getEntity(id);
        String name = request.nome().trim();
        validateUniqueName(name, id);
        service.atualizar(name);
        return MaintenanceServiceResponse.from(service);
    }

    @Transactional
    public void deactivate(Integer id) {
        getEntity(id).desativar();
    }

    @Transactional
    public MaintenanceServiceResponse reactivate(Integer id) {
        MaintenanceServiceType service = getEntity(id);
        service.reativar();
        return MaintenanceServiceResponse.from(service);
    }

    public MaintenanceServiceType getEntity(Integer id) {
        return repository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Servico de manutencao", id));
    }

    public Map<Integer, MaintenanceServiceType> getActiveEntities(Collection<Integer> ids) {
        if (ids.isEmpty()) {
            return Map.of();
        }

        Map<Integer, MaintenanceServiceType> found = repository.findAllById(ids).stream()
            .collect(java.util.stream.Collectors.toMap(
                MaintenanceServiceType::getId,
                service -> service,
                (first, ignored) -> first,
                LinkedHashMap::new));

        for (Integer id : ids) {
            MaintenanceServiceType service = found.get(id);
            if (service == null) {
                throw new ResourceNotFoundException("Servico de manutencao", id);
            }
            if (!service.getAtivo()) {
                throw new BusinessRuleException("O servico de manutencao selecionado esta inativo.");
            }
        }
        return found;
    }

    private void validateUniqueName(String name, Integer currentId) {
        repository.findByNameIgnoreCase(name)
            .filter(service -> !service.getId().equals(currentId))
            .ifPresent(service -> {
                throw new BusinessRuleException(
                    service.getAtivo()
                        ? "Ja existe um servico de manutencao com este nome."
                        : "Ja existe um servico inativo com este nome; reative-o.");
            });
    }

}
