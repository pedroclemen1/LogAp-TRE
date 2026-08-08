package br.com.logap.logitrack.vehicle.dto;

import java.math.BigDecimal;

import br.com.logap.logitrack.vehicle.VehicleType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@Schema(description = "Dados para cadastrar ou atualizar um veiculo na frota")
public record VehicleRequest(

    /**
     * Aceita os dois formatos que circulam no Brasil: o antigo ABC-1234 e o
     * Mercosul ABC1D23. A coluna tem VARCHAR(10), entao o hifen cabe.
     */
    @NotBlank(message = "Informe a placa.")
    @Size(max = 10, message = "A placa deve ter no maximo 10 caracteres.")
    @Pattern(regexp = "^[A-Z]{3}-?\\d[A-Z0-9]\\d{2}$",
        message = "Placa invalida. Use o formato ABC-1234 ou ABC1D23.")
    @Schema(example = "ABC-1234", requiredMode = Schema.RequiredMode.REQUIRED)
    String placa,

    @NotBlank(message = "Informe o modelo.")
    @Size(max = 50, message = "O modelo deve ter no maximo 50 caracteres.")
    @Schema(example = "Volvo FH", requiredMode = Schema.RequiredMode.REQUIRED)
    String modelo,

    @NotNull(message = "Selecione o tipo do veiculo.")
    @Schema(example = "PESADO", requiredMode = Schema.RequiredMode.REQUIRED)
    VehicleType tipo,

    /**
     * Limite superior deliberadamente frouxo: fabricantes emplacam o modelo do
     * ano seguinte. Validar contra o ano corrente exato rejeitaria cadastro
     * legitimo em novembro.
     */
    @NotNull(message = "Informe o ano.")
    @Min(value = 1950, message = "Ano invalido.")
    @Max(value = 2100, message = "Ano invalido.")
    @Schema(example = "2023", requiredMode = Schema.RequiredMode.REQUIRED)
    Integer ano,

    /**
     * Zero para veiculo novo; hodometro de entrada para usado. Nao e o
     * hodometro atual — esse e calculado somando as viagens.
     */
    @NotNull(message = "Informe a quilometragem. Use 0 para veiculo zero-quilometro.")
    @DecimalMin(value = "0.0", message = "A quilometragem nao pode ser negativa.")
    @Digits(integer = 8, fraction = 2, message = "Quilometragem fora do intervalo permitido.")
    @Schema(example = "312050.00", requiredMode = Schema.RequiredMode.REQUIRED)
    BigDecimal kmInicial
) {
}
