package br.com.logap.logitrack.maintenance.dto;

import java.math.BigDecimal;

import br.com.logap.logitrack.maintenance.MaintenanceItem;

public record MaintenanceItemResponse(
    Integer id,
    Integer servicoId,
    String nome,
    BigDecimal custo
) {
    public static MaintenanceItemResponse from(MaintenanceItem item) {
        return new MaintenanceItemResponse(
            item.getId(), item.getServicoCatalogo().getId(), item.getNomeServico(), item.getCusto());
    }
}

