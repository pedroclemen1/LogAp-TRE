package br.com.logap.logitrack.manifest.dto;

import java.math.BigDecimal;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Linha da carga. A sequencia impressa nao vem do cliente: quem numera e o romaneio. */
@Schema(description = "Item da carga (uma nota fiscal embarcada)")
public record ManifestItemRequest(

    @NotBlank(message = "Informe a nota fiscal.")
    @Size(max = 30, message = "A nota fiscal deve ter no maximo 30 caracteres.")
    String notaFiscal,

    @NotBlank(message = "Informe o destinatario final.")
    @Size(max = 150, message = "O destinatario deve ter no maximo 150 caracteres.")
    String destinatario,

    @NotNull(message = "Informe a quantidade de volumes.")
    @Min(value = 1, message = "A quantidade de volumes deve ser maior que zero.")
    @Max(value = 999999, message = "Quantidade de volumes fora do intervalo permitido.")
    Integer volumes,

    @NotNull(message = "Informe o peso do item.")
    @DecimalMin(value = "0.0", message = "O peso nao pode ser negativo.")
    @Digits(integer = 8, fraction = 2, message = "Peso fora do intervalo permitido.")
    BigDecimal pesoKg
) {
}
