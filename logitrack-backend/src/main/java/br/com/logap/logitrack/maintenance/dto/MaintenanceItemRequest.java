package br.com.logap.logitrack.maintenance.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;

public record MaintenanceItemRequest(
    Integer id,

    @NotNull(message = "Selecione o servico.")
    Integer servicoId,

    @NotNull(message = "Informe o custo do servico.")
    @DecimalMin(value = "0.0", message = "O custo nao pode ser negativo.")
    @Digits(integer = 8, fraction = 2, message = "O custo deve ter no maximo 8 inteiros e 2 decimais.")
    BigDecimal custo
) {
}

