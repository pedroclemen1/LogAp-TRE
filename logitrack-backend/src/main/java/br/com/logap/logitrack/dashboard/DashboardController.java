package br.com.logap.logitrack.dashboard;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import br.com.logap.logitrack.dashboard.dto.DashboardResponse;
import br.com.logap.logitrack.vehicle.VehicleType;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/dashboard")
@Tag(name = "Dashboard", description = "Metricas operacionais extraidas por SQL nativo")
public class DashboardController {

    private final DashboardService service;

    public DashboardController(DashboardService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(
        summary = "Retorna as 5 metricas do painel analitico",
        description = """
            Total de KM, volume por categoria, cronograma das proximas 5 manutencoes,
            ranking de utilizacao e projecao financeira do mes.
            """)
    public ResponseEntity<DashboardResponse> get(
        @Parameter(description = "Restringe o Total de KM a um veiculo; ausente agrega a frota")
        @RequestParam(required = false) Integer veiculoId,
        @Parameter(description = "Periodo historico em dias; aceita 7 ou 30. Ausente preserva o acumulado")
        @RequestParam(required = false) Integer dias,
        @Parameter(description = "Restringe as metricas a uma categoria de veiculo")
        @RequestParam(required = false) VehicleType tipo) {
        return ResponseEntity.ok(service.build(veiculoId, dias, tipo));
    }
}
