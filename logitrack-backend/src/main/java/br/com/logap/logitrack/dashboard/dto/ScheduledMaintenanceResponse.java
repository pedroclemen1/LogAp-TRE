package br.com.logap.logitrack.dashboard.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import br.com.logap.logitrack.dashboard.projection.ScheduledMaintenanceView;
import br.com.logap.logitrack.maintenance.MaintenanceStatus;

public record ScheduledMaintenanceResponse(
    Integer id,
    String placa,
    String modelo,
    LocalDate dataInicio,
    String tipoServico,
    BigDecimal custoEstimado,
    MaintenanceStatus status
) {
    public static ScheduledMaintenanceResponse from(ScheduledMaintenanceView view) {
        return new ScheduledMaintenanceResponse(
            view.getId(), view.getPlaca(), view.getModelo(), view.getDataInicio(),
            view.getTipoServico(), view.getCustoEstimado(),
            MaintenanceStatus.valueOf(view.getStatus()));
    }
}
