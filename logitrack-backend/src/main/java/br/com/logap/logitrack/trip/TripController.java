package br.com.logap.logitrack.trip;

import java.net.URI;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
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

import br.com.logap.logitrack.trip.dto.TripDeleteRequest;
import br.com.logap.logitrack.trip.dto.TripDetailsResponse;
import br.com.logap.logitrack.trip.dto.TripRequest;
import br.com.logap.logitrack.trip.dto.TripResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/viagens")
@Tag(name = "Viagens", description = "Planejamento e execucao de viagens")
public class TripController {

    private final TripService service;

    public TripController(TripService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "Lista viagens paginadas com busca e filtros")
    public ResponseEntity<Page<TripResponse>> list(
        @RequestParam(required = false) String busca,
        @RequestParam(required = false) Integer veiculoId,
        @RequestParam(required = false) TripStatus status,
        @PageableDefault(size = 10, sort = "dataSaida", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(service.list(busca, veiculoId, status, pageable));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Retorna os dados cadastrais de uma viagem")
    public ResponseEntity<TripResponse> findById(@PathVariable Integer id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @GetMapping("/{id}/detalhes")
    @Operation(summary = "Detalha uma viagem com etapas da rota e change log")
    public ResponseEntity<TripDetailsResponse> details(@PathVariable Integer id) {
        return ResponseEntity.ok(service.findDetails(id));
    }

    @PostMapping
    @Operation(summary = "Cadastra uma viagem")
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Criada"),
        @ApiResponse(responseCode = "400", description = "Campos invalidos"),
        @ApiResponse(responseCode = "422", description = "Regra de datas violada")
    })
    public ResponseEntity<TripResponse> create(@RequestBody @Valid TripRequest request) {
        TripResponse created = service.create(request);
        return ResponseEntity.created(URI.create("/api/viagens/" + created.id())).body(created);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualiza uma viagem")
    public ResponseEntity<TripResponse> update(@PathVariable Integer id, @RequestBody @Valid TripRequest request) {
        return ResponseEntity.ok(service.update(id, request));
    }

    @PatchMapping("/{id}/iniciar")
    @Operation(summary = "Inicia uma viagem e reserva motorista e veiculo")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Iniciada"),
        @ApiResponse(responseCode = "422", description = "Recurso ocupado ou motorista ausente")
    })
    public ResponseEntity<TripResponse> start(@PathVariable Integer id) {
        return ResponseEntity.ok(service.start(id));
    }

    @PatchMapping("/{id}/concluir")
    @Operation(summary = "Conclui uma viagem em andamento usando o horario atual")
    public ResponseEntity<TripResponse> finish(@PathVariable Integer id) {
        return ResponseEntity.ok(service.finish(id));
    }

    @PatchMapping("/{id}/trechos/{trechoId}/concluir")
    @Operation(summary = "Registra a chegada em um trecho da rota",
        description = "Marca a chegada real no trecho informado, sem encerrar a viagem. "
            + "Os trechos precisam ser concluidos na ordem da rota; concluir o ULTIMO "
            + "encerra a viagem. Alimenta a base temporal do romaneio.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Trecho concluido"),
        @ApiResponse(responseCode = "404", description = "Viagem nao encontrada"),
        @ApiResponse(responseCode = "422", description = "Viagem nao iniciada, trecho ja concluido ou fora de ordem")
    })
    public ResponseEntity<TripResponse> completeStage(@PathVariable Integer id,
                                                      @PathVariable Integer trechoId) {
        return ResponseEntity.ok(service.completeStage(id, trechoId));
    }

    @PatchMapping("/{id}/cancelar")
    @Operation(summary = "Cancela uma viagem programada ou em andamento")
    public ResponseEntity<TripResponse> cancel(@PathVariable Integer id) {
        return ResponseEntity.ok(service.cancel(id));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Remove uma viagem e seu historico dependente")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    @Operation(summary = "Remove varias viagens em uma operacao atomica")
    public ResponseEntity<Void> deleteMany(@RequestBody @Valid TripDeleteRequest request) {
        service.deleteAll(request.ids());
        return ResponseEntity.noContent().build();
    }
}
