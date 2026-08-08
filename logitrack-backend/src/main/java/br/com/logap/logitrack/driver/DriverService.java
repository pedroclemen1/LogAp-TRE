package br.com.logap.logitrack.driver;

import java.util.List;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.logap.logitrack.shared.ActiveStatus;
import br.com.logap.logitrack.shared.BusinessRuleException;
import br.com.logap.logitrack.shared.ResourceNotFoundException;
import br.com.logap.logitrack.shared.SearchPattern;
import br.com.logap.logitrack.trip.TripRepository;

@Service
@Transactional(readOnly = true)
public class DriverService {

    private final DriverRepository repository;
    private final TripRepository tripRepository;

    public DriverService(DriverRepository repository, TripRepository tripRepository) {
        this.repository = repository;
        this.tripRepository = tripRepository;
    }

    public List<DriverResponse> list(String search, ActiveStatus status) {
        ActiveStatus effectiveStatus = status == null ? ActiveStatus.ATIVO : status;
        Set<Integer> driversInUse = tripRepository.findActiveDriverIds();
        return repository.findFiltered(SearchPattern.contains(search), effectiveStatus.name()).stream()
            .map(driver -> DriverResponse.from(driver, driversInUse.contains(driver.getId())))
            .toList();
    }

    public DriverResponse findById(Integer id) {
        Driver driver = getEntity(id);
        return DriverResponse.from(driver, tripRepository.findActiveDriverIds().contains(id));
    }

    @Transactional
    public DriverResponse create(DriverRequest request) {
        String license = normalizeLicense(request.cnh());
        validateUniqueLicense(license, null);
        Driver driver = new Driver(request.nome().trim(), license, normalizePhone(request.telefone()));
        return DriverResponse.from(repository.save(driver), false);
    }

    @Transactional
    public DriverResponse update(Integer id, DriverRequest request) {
        Driver driver = getEntity(id);
        String license = normalizeLicense(request.cnh());
        validateUniqueLicense(license, id);
        driver.atualizar(request.nome().trim(), license, normalizePhone(request.telefone()));
        return DriverResponse.from(driver, tripRepository.findActiveDriverIds().contains(id));
    }

    @Transactional
    public void deactivate(Integer id) {
        Driver driver = getEntity(id);
        if (!driver.getAtivo()) return;
        if (tripRepository.existsUnfinishedByDriver(id)) {
            throw new BusinessRuleException(
                "Reatribua, cancele ou conclua as viagens nao encerradas antes de desativar o motorista.");
        }
        driver.desativar();
    }

    @Transactional
    public DriverResponse reactivate(Integer id) {
        Driver driver = getEntity(id);
        driver.reativar();
        return DriverResponse.from(driver, false);
    }

    private Driver getEntity(Integer id) {
        return repository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Motorista", id));
    }

    private void validateUniqueLicense(String license, Integer currentId) {
        repository.findByCnh(license)
            .filter(driver -> !driver.getId().equals(currentId))
            .ifPresent(driver -> {
                throw new BusinessRuleException("Ja existe um motorista cadastrado com esta CNH.");
            });
    }

    private static String normalizeLicense(String license) {
        return license.trim();
    }

    private static String normalizePhone(String phone) {
        return phone == null || phone.isBlank() ? null : phone.trim();
    }

}
