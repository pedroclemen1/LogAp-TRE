package br.com.logap.logitrack.driver;

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
@RequestMapping("/api/motoristas")
@Tag(name = "Motoristas", description = "Cadastro e disponibilidade de motoristas")
public class DriverController {

    private final DriverService service;

    public DriverController(DriverService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "Lista motoristas; por padrao retorna apenas ativos")
    public ResponseEntity<List<DriverResponse>> list(
        @RequestParam(required = false) String busca,
        @RequestParam(required = false) ActiveStatus status) {
        return ResponseEntity.ok(service.list(busca, status));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Detalha um motorista")
    public ResponseEntity<DriverResponse> findById(@PathVariable Integer id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('GESTOR')")
    @Operation(summary = "Cadastra um motorista")
    public ResponseEntity<DriverResponse> create(@RequestBody @Valid DriverRequest request) {
        DriverResponse created = service.create(request);
        return ResponseEntity.created(URI.create("/api/motoristas/" + created.id())).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('GESTOR')")
    @Operation(summary = "Atualiza um motorista")
    public ResponseEntity<DriverResponse> update(@PathVariable Integer id,
                                                  @RequestBody @Valid DriverRequest request) {
        return ResponseEntity.ok(service.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('GESTOR')")
    @Operation(summary = "Desativa um motorista sem apagar o historico")
    public ResponseEntity<Void> deactivate(@PathVariable Integer id) {
        service.deactivate(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/reativar")
    @PreAuthorize("hasRole('GESTOR')")
    @Operation(summary = "Reativa um motorista")
    public ResponseEntity<DriverResponse> reactivate(@PathVariable Integer id) {
        return ResponseEntity.ok(service.reactivate(id));
    }
}
