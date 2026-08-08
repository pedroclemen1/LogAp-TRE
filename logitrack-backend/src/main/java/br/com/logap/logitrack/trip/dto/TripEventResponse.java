package br.com.logap.logitrack.trip.dto;

import java.time.LocalDateTime;

import br.com.logap.logitrack.trip.TripEvent;
import br.com.logap.logitrack.trip.TripEventType;

public record TripEventResponse(
    Integer id,
    TripEventType tipo,
    String titulo,
    String detalhe,
    String autor,
    LocalDateTime ocorridoEm
) {
    public static TripEventResponse from(TripEvent event) {
        return new TripEventResponse(
            event.getId(), event.getTipo(), event.getTitulo(), event.getDetalhe(),
            event.getAutor(), event.getOcorridoEm());
    }
}
