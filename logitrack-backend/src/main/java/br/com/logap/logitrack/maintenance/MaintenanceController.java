package br.com.logap.logitrack.maintenance;

import java.net.URI;
import java.time.LocalDate;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
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

import br.com.logap.logitrack.maintenance.dto.MaintenanceRequest;
import br.com.logap.logitrack.maintenance.dto.MaintenanceResponse;
import br.com.logap.logitrack.maintenance.dto.MaintenanceSummaryResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/manutencoes")
@Tag(name = "Manutencoes", description = "Ordens de manutencao da frota")
public class MaintenanceController {

    private final MaintenanceService service;

    public MaintenanceController(MaintenanceService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "Lista ordens de manutencao com filtros e paginacao")
    public ResponseEntity<Page<MaintenanceResponse>> list(
        @RequestParam(required = false) String busca,
        @RequestParam(required = false) Integer veiculoId,
        @RequestParam(required = false) MaintenanceStatus status,
        @RequestParam(required = false) Boolean atrasada,
        @RequestParam(required = false) LocalDate inicioDe,
        @RequestParam(required = false) LocalDate inicioAte,
        @RequestParam(required = false) MaintenanceOrder ordem,
        @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(service.list(
            busca, veiculoId, status, atrasada, inicioDe, inicioAte, ordem, pageable));
    }

    @GetMapping("/resumo")
    @Operation(summary = "Indicadores e agenda operacional do modulo")
    public ResponseEntity<MaintenanceSummaryResponse> summary() {
        return ResponseEntity.ok(service.summary());
    }

    @GetMapping("/{id}")
    public ResponseEntity<MaintenanceResponse> findById(@PathVariable Integer id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @PostMapping
    public ResponseEntity<MaintenanceResponse> create(@RequestBody @Valid MaintenanceRequest request) {
        MaintenanceResponse created = service.create(request);
        return ResponseEntity.created(URI.create("/api/manutencoes/" + created.id())).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<MaintenanceResponse> update(@PathVariable Integer id,
                                                      @RequestBody @Valid MaintenanceRequest request) {
        return ResponseEntity.ok(service.update(id, request));
    }

    @PatchMapping("/{id}/iniciar")
    public ResponseEntity<MaintenanceResponse> start(@PathVariable Integer id) {
        return ResponseEntity.ok(service.start(id));
    }

    @PatchMapping("/{id}/concluir")
    public ResponseEntity<MaintenanceResponse> finish(@PathVariable Integer id) {
        return ResponseEntity.ok(service.finish(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}

