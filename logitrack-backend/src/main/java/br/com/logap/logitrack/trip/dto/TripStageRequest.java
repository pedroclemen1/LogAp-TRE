package br.com.logap.logitrack.trip.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

@Schema(description = "Trecho ponto a ponto de uma viagem; a origem e implicita no trecho anterior")
public record TripStageRequest(

    @Positive
    @Schema(description = "ID existente no PUT; ausente no POST")
    Integer id,

    @NotBlank(message = "Informe o destino do trecho.")
    @Size(max = 100)
    String destino,

    @NotNull(message = "Informe a quilometragem do trecho.")
    @DecimalMin(value = "0.0", inclusive = false, message = "A quilometragem do trecho deve ser maior que zero.")
    @Digits(integer = 8, fraction = 2, message = "Quilometragem do trecho fora do intervalo permitido.")
    BigDecimal kmTrecho,

    @NotNull(message = "Informe a carga do trecho.")
    @DecimalMin(value = "0.0", message = "A carga do trecho nao pode ser negativa.")
    @Digits(integer = 8, fraction = 2, message = "Carga do trecho fora do intervalo permitido.")
    BigDecimal cargaKg,

    @Schema(description = "Previsao opcional de chegada neste destino")
    LocalDateTime previstoEm
) {
}
