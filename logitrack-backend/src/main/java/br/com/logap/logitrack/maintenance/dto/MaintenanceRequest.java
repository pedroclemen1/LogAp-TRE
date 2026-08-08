package br.com.logap.logitrack.maintenance.dto;

import java.time.LocalDate;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Schema(description = "Planejamento de uma ordem de manutencao")
public record MaintenanceRequest(

    @NotNull(message = "Selecione um veiculo.")
    Integer veiculoId,

    @NotNull(message = "Informe a data prevista de inicio.")
    LocalDate dataInicioPrevista,

    @NotNull(message = "Informe a data prevista de finalizacao.")
    LocalDate dataFinalizacaoPrevista,

    @NotEmpty(message = "Adicione pelo menos um servico.")
    @Size(max = 30, message = "Uma manutencao pode ter no maximo 30 servicos.")
    List<@Valid MaintenanceItemRequest> servicos
) {
}

