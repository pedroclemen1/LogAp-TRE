package br.com.logap.logitrack.trip.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import br.com.logap.logitrack.trip.TripStage;

public record TripStageResponse(
    Integer id,
    Short ordem,
    String cidade,
    BigDecimal kmTrecho,
    BigDecimal cargaKg,
    LocalDateTime previstoEm,
    LocalDateTime realizadoEm
) {
    public static TripStageResponse from(TripStage stage) {
        return new TripStageResponse(
            stage.getId(), stage.getOrdem(), stage.getCidade(), stage.getKmTrecho(), stage.getCargaKg(),
            stage.getPrevistoEm(), stage.getRealizadoEm());
    }
}
