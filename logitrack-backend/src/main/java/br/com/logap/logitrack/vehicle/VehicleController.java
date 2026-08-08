package br.com.logap.logitrack.vehicle;

import java.net.URI;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import br.com.logap.logitrack.vehicle.dto.FleetVehicleResponse;
import br.com.logap.logitrack.vehicle.dto.VehicleDeleteRequest;
import br.com.logap.logitrack.vehicle.dto.VehicleRequest;
import br.com.logap.logitrack.vehicle.dto.VehicleResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/veiculos")
@Tag(name = "Veiculos", description = "Cadastro e consulta da frota")
public class VehicleController {

    private final VehicleService service;

    public VehicleController(VehicleService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "Lista todos os veiculos, ordenados por placa",
        description = "Resposta enxuta, sem paginacao: alimenta combos de selecao de veiculo.")
    public ResponseEntity<List<VehicleResponse>> list() {
        return ResponseEntity.ok(service.listAll());
    }

    @GetMapping("/frota")
    @Operation(summary = "Frota paginada com indicadores operacionais",
        description = """
            Alimenta a tela de Veiculos. Alem dos dados cadastrais traz, por veiculo,
            o hodometro, a ultima viagem, a proxima manutencao e a situacao
            operacional — todos derivados por SQL, sem coluna de status no banco.
            Os tres filtros sao opcionais e combinaveis. Ordenacao fixa por placa.
            """)
    public ResponseEntity<Page<FleetVehicleResponse>> fleet(
        @Parameter(description = "Trecho de placa ou modelo, sem diferenciar maiusculas", example = "volvo")
        @RequestParam(required = false) String busca,

        @Parameter(description = "Filtra por categoria do veiculo")
        @RequestParam(required = false) VehicleType tipo,

        @Parameter(description = "Filtra pela situacao operacional derivada")
        @RequestParam(required = false) VehicleOperationalStatus status,

        @PageableDefault(size = 20) Pageable pageable) {

        return ResponseEntity.ok(service.listFleet(busca, tipo, status, pageable));
    }

    @PostMapping
    @PreAuthorize("hasRole('GESTOR')")
    @Operation(summary = "Cadastra um veiculo na frota",
        description = """
            `kmInicial` e o hodometro na entrada: 0 para zero-quilometro, o valor
            lido no painel para usado. Nao e o hodometro atual, que o sistema
            calcula somando as viagens registradas.
            """)
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Cadastrado"),
        @ApiResponse(responseCode = "400", description = "Campos invalidos"),
        @ApiResponse(responseCode = "422", description = "Placa ja cadastrada")
    })
    public ResponseEntity<VehicleResponse> create(@RequestBody @Valid VehicleRequest request) {
        VehicleResponse created = service.create(request);
        return ResponseEntity.created(URI.create("/api/veiculos/" + created.id())).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('GESTOR')")
    @Operation(summary = "Atualiza os dados cadastrais de um veiculo")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Atualizado"),
        @ApiResponse(responseCode = "400", description = "Campos invalidos"),
        @ApiResponse(responseCode = "404", description = "Veiculo nao encontrado"),
        @ApiResponse(responseCode = "422", description = "Placa ja cadastrada")
    })
    public ResponseEntity<VehicleResponse> update(@PathVariable Integer id,
                                                   @RequestBody @Valid VehicleRequest request) {
        return ResponseEntity.ok(service.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('GESTOR')")
    @Operation(summary = "Exclui um veiculo sem historico operacional")
    @ApiResponses({
        @ApiResponse(responseCode = "204", description = "Excluido"),
        @ApiResponse(responseCode = "404", description = "Veiculo nao encontrado"),
        @ApiResponse(responseCode = "422", description = "Veiculo possui historico")
    })
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    @PreAuthorize("hasRole('GESTOR')")
    @Operation(summary = "Exclui em lote veiculos sem historico operacional",
        description = "A operacao e atomica: se um veiculo estiver bloqueado, nenhum e excluido.")
    @ApiResponses({
        @ApiResponse(responseCode = "204", description = "Excluidos"),
        @ApiResponse(responseCode = "400", description = "Selecao invalida"),
        @ApiResponse(responseCode = "404", description = "Veiculo nao encontrado"),
        @ApiResponse(responseCode = "422", description = "Um ou mais veiculos possuem historico")
    })
    public ResponseEntity<Void> deleteMany(@RequestBody @Valid VehicleDeleteRequest request) {
        service.deleteAll(request.ids());
        return ResponseEntity.noContent().build();
    }
}
