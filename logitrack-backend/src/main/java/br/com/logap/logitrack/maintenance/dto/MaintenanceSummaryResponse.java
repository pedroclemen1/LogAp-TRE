package br.com.logap.logitrack.maintenance.dto;

import java.math.BigDecimal;
import java.util.List;

public record MaintenanceSummaryResponse(
    long totalVeiculos,
    long veiculosIndisponiveis,
    BigDecimal custoMesAtual,
    long ordensEmAndamento,
    long tarefasAtrasadas,
    List<MaintenanceResponse> agenda
) {
}

