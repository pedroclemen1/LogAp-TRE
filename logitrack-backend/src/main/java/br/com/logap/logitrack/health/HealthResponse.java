package br.com.logap.logitrack.health;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Estado de execucao da API")
public record HealthResponse(String message) {
}
