package br.com.logap.logitrack.maintenance.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import br.com.logap.logitrack.maintenance.Maintenance;
import br.com.logap.logitrack.maintenance.MaintenanceStatus;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Ordem de manutencao")
public record MaintenanceResponse(
    Integer id,
    Integer veiculoId,
    String veiculoPlaca,
    String veiculoModelo,
    LocalDate dataInicioPrevista,
    LocalDate dataFinalizacaoPrevista,
    LocalDateTime iniciadaEm,
    LocalDateTime concluidaEm,
    List<MaintenanceItemResponse> servicos,
    BigDecimal custoTotal,
    MaintenanceStatus status,
    boolean atrasada
) {
    /**
     * `hoje` chega por parametro de proposito. A flag de atraso e regra de
     * dominio (ver `Maintenance.estaAtrasada`); um DTO de resposta chamando
     * `LocalDate.now()` tornava essa regra intestavel sem mexer no relogio da
     * JVM. Quem monta a resposta passa o dia vindo do `Clock` injetado.
     */
    public static MaintenanceResponse from(Maintenance maintenance, LocalDate hoje) {
        List<MaintenanceItemResponse> items = maintenance.getServicos().stream()
            .map(MaintenanceItemResponse::from)
            .toList();
        BigDecimal total = items.stream()
            .map(MaintenanceItemResponse::custo)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new MaintenanceResponse(
            maintenance.getId(),
            maintenance.getVeiculo().getId(),
            maintenance.getVeiculo().getPlaca(),
            maintenance.getVeiculo().getModelo(),
            maintenance.getDataInicioPrevista(),
            maintenance.getDataFinalizacaoPrevista(),
            maintenance.getIniciadaEm(),
            maintenance.getConcluidaEm(),
            items,
            total,
            maintenance.getStatus(),
            maintenance.estaAtrasada(hoje));
    }
}

