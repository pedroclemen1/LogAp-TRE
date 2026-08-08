package br.com.logap.logitrack.dashboard.dto;

import java.math.BigDecimal;

import br.com.logap.logitrack.dashboard.projection.CategoryVolumeView;
import br.com.logap.logitrack.vehicle.VehicleType;

public record CategoryVolumeResponse(VehicleType tipo, long totalViagens, BigDecimal totalKm) {

    public static CategoryVolumeResponse from(CategoryVolumeView view) {
        return new CategoryVolumeResponse(
            VehicleType.valueOf(view.getTipo()),
            view.getTotalViagens(),
            view.getTotalKm());
    }
}
