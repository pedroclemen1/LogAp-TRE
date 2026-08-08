package br.com.logap.logitrack.vehicle.dto;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

@Schema(description = "Veiculos selecionados para exclusao em lote")
public record VehicleDeleteRequest(
    @NotEmpty(message = "Selecione ao menos um veiculo.")
    @Size(max = 100, message = "Exclua no maximo 100 veiculos por vez.")
    @Valid
    List<@NotNull @Positive Integer> ids
) {
}
