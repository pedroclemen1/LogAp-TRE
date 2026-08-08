package br.com.logap.logitrack.maintenance.catalog;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Nome de um servico disponivel no catalogo")
public record MaintenanceServiceRequest(
    @NotBlank(message = "Informe o nome do servico.")
    @Size(max = 100)
    String nome
) {
}
