package br.com.logap.logitrack.trip.dto;

import java.time.LocalDateTime;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Schema(description = "Dados da viagem e sua rota ponto a ponto")
public record TripRequest(

    @NotNull(message = "Selecione um veiculo.")
    Integer veiculoId,

    @Schema(description = "Motorista opcional")
    Integer motoristaId,

    @NotNull(message = "Informe a data e hora de saida.")
    LocalDateTime dataSaida,

    @NotBlank(message = "Informe a cidade de origem.")
    @Size(max = 100)
    String origem,

    @NotEmpty(message = "Adicione ao menos um trecho a rota.")
    @Size(max = 30, message = "Uma viagem pode ter no maximo 30 trechos.")
    List<@Valid TripStageRequest> trechos
) {
}
