package br.com.logap.logitrack.maintenance.catalog;

import java.net.URI;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import br.com.logap.logitrack.shared.ActiveStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/servicos-manutencao")
@Tag(name = "Servicos de Manutencao", description = "Catalogo mestre de servicos")
public class MaintenanceServiceCatalogController {

    private final MaintenanceServiceCatalogService service;

    public MaintenanceServiceCatalogController(MaintenanceServiceCatalogService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "Lista servicos; por padrao retorna apenas ativos")
    public ResponseEntity<List<MaintenanceServiceResponse>> list(
        @RequestParam(required = false) String busca,
        @RequestParam(required = false) ActiveStatus status) {
        return ResponseEntity.ok(service.list(busca, status));
    }

    @GetMapping("/{id}")
    public ResponseEntity<MaintenanceServiceResponse> findById(@PathVariable Integer id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('GESTOR')")
    public ResponseEntity<MaintenanceServiceResponse> create(
        @RequestBody @Valid MaintenanceServiceRequest request) {
        MaintenanceServiceResponse created = service.create(request);
        return ResponseEntity.created(URI.create("/api/servicos-manutencao/" + created.id())).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('GESTOR')")
    public ResponseEntity<MaintenanceServiceResponse> update(
        @PathVariable Integer id, @RequestBody @Valid MaintenanceServiceRequest request) {
        return ResponseEntity.ok(service.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('GESTOR')")
    public ResponseEntity<Void> deactivate(@PathVariable Integer id) {
        service.deactivate(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/reativar")
    @PreAuthorize("hasRole('GESTOR')")
    public ResponseEntity<MaintenanceServiceResponse> reactivate(@PathVariable Integer id) {
        return ResponseEntity.ok(service.reactivate(id));
    }
}
