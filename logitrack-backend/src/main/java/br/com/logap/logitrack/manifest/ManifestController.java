package br.com.logap.logitrack.manifest;

import java.net.URI;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import br.com.logap.logitrack.manifest.dto.ManifestCandidateResponse;
import br.com.logap.logitrack.manifest.dto.ManifestRequest;
import br.com.logap.logitrack.manifest.dto.ManifestResponse;
import br.com.logap.logitrack.manifest.dto.ManifestSummaryResponse;
import br.com.logap.logitrack.trip.TripStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/romaneios")
@Tag(name = "Romaneios", description = "Emissao e consulta do documento de carga")
public class ManifestController {

    private final ManifestService service;

    public ManifestController(ManifestService service) {
        this.service = service;
    }

    @GetMapping("/viagens")
    @Operation(summary = "Viagens e seus trechos, para emissao de romaneio",
        description = "Mesmas viagens e filtros da tela de Viagens. Cada viagem traz `trechos`; "
            + "`romaneioId` presente num trecho indica que ele ja tem documento emitido.")
    public ResponseEntity<Page<ManifestCandidateResponse>> candidates(
            @RequestParam(required = false) String busca,
            @RequestParam(required = false) Integer veiculoId,
            @RequestParam(required = false) TripStatus status,
            @PageableDefault(size = 10, sort = "dataSaida", direction = Sort.Direction.DESC)
            Pageable pageable) {
        return ResponseEntity.ok(service.listCandidates(busca, veiculoId, status, pageable));
    }

    @GetMapping
    @Operation(summary = "Romaneios ja emitidos, do mais recente para o mais antigo")
    public ResponseEntity<Page<ManifestSummaryResponse>> list(
            @RequestParam(required = false) String busca,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(service.list(busca, pageable));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Documento completo, como impresso")
    @ApiResponse(responseCode = "404", description = "Romaneio nao encontrado")
    public ResponseEntity<ManifestResponse> findById(@PathVariable Integer id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @GetMapping("/trecho/{etapaId}")
    @Operation(summary = "Romaneio de um trecho")
    @ApiResponse(responseCode = "404", description = "O trecho nao possui romaneio")
    public ResponseEntity<ManifestResponse> findByStage(@PathVariable Integer etapaId) {
        return ResponseEntity.ok(service.findByStage(etapaId));
    }

    @PostMapping
    @Operation(summary = "Emite o romaneio de um trecho",
        description = "So trecho CONCLUIDO emite; a viagem pode seguir em andamento. Motorista, "
            + "placa, origem, destino e distancia sao copiados do trecho e da viagem; o corpo traz "
            + "apenas o que o cadastro nao tem. Um trecho so pode ter um romaneio.")
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Romaneio emitido"),
        @ApiResponse(responseCode = "404", description = "Trecho nao encontrado"),
        @ApiResponse(responseCode = "422", description = "Trecho nao concluido, sem motorista ou ja com romaneio")
    })
    public ResponseEntity<ManifestResponse> issue(@RequestBody @Valid ManifestRequest request) {
        ManifestResponse created = service.issue(request);
        return ResponseEntity.created(URI.create("/api/romaneios/" + created.id())).body(created);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Corrige um romaneio ja emitido",
        description = "Numero, data e autor da emissao nao mudam. O codigo de integridade e "
            + "recalculado: ele deriva do conteudo, entao o codigo novo indica que o papel "
            + "anterior foi substituido.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Romaneio atualizado"),
        @ApiResponse(responseCode = "404", description = "Romaneio nao encontrado"),
        @ApiResponse(responseCode = "422", description = "Nota fiscal repetida")
    })
    public ResponseEntity<ManifestResponse> update(@PathVariable Integer id,
                                                   @RequestBody @Valid ManifestRequest request) {
        return ResponseEntity.ok(service.update(id, request));
    }
}
