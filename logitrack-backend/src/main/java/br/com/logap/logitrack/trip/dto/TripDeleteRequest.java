package br.com.logap.logitrack.trip.dto;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record TripDeleteRequest(
    @NotEmpty(message = "Selecione ao menos uma viagem.")
    @Size(max = 100, message = "Exclua no maximo 100 viagens por vez.")
    @Valid
    List<@NotNull @Positive Integer> ids
) {
}
