package br.com.logap.logitrack.dashboard.dto;

import java.math.BigDecimal;

import br.com.logap.logitrack.dashboard.projection.VehicleUsageView;
import br.com.logap.logitrack.vehicle.VehicleType;

public record VehicleUsageResponse(
    Integer id,
    String placa,
    String modelo,
    VehicleType tipo,
    BigDecimal kmAcumulado
) {
    public static VehicleUsageResponse from(VehicleUsageView view) {
        return new VehicleUsageResponse(
            view.getId(), view.getPlaca(), view.getModelo(),
            VehicleType.valueOf(view.getTipo()), view.getKmAcumulado());
    }
}
