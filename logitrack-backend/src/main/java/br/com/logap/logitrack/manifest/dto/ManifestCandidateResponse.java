package br.com.logap.logitrack.manifest.dto;

import java.time.LocalDateTime;
import java.util.List;

import br.com.logap.logitrack.trip.TripStatus;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Uma viagem na tela de Romaneios, com seus trechos.
 *
 * A linha fechada mostra a viagem; o painel expandido mostra `trechos`, e e ali
 * que a emissao acontece — o romaneio pertence ao trecho, nao a viagem.
 */
@Schema(description = "Viagem e seus trechos, para emissao de romaneio")
public record ManifestCandidateResponse(
    Integer viagemId,
    LocalDateTime dataSaida,
    String origem,
    String destino,
    String veiculoPlaca,
    String veiculoModelo,
    String motoristaNome,
    @Schema(description = "Vai para o documento; permite pre-visualizar o romaneio inteiro")
    String motoristaCnh,
    TripStatus status,
    List<ManifestStageResponse> trechos
) {
}
