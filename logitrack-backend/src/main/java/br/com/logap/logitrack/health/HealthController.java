package br.com.logap.logitrack.health;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/health")
@Tag(name = "Healthcheck", description = "Diagnostico autenticado da API")
public class HealthController {

    @GetMapping
    @Operation(summary = "Confirma que a API esta em execucao")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "API em execucao"),
        @ApiResponse(responseCode = "401", description = "Token ausente ou invalido")
    })
    public HealthResponse health() {
        return new HealthResponse("api is running");
    }
}
