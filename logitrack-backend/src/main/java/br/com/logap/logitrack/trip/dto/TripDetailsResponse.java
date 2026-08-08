package br.com.logap.logitrack.trip.dto;

import java.util.List;

public record TripDetailsResponse(
    TripResponse viagem,
    List<TripStageResponse> etapas,
    List<TripEventResponse> eventos
) {
}
