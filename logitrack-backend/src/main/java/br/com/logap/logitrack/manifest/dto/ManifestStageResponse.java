package br.com.logap.logitrack.manifest.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Um trecho da rota, com o estado do romaneio dele.
 *
 * `origem` NAO e coluna do trecho: e derivada — cidade do trecho anterior, ou a
 * origem da viagem quando `ordem = 1`. O painel expandido da tela precisa dela
 * para mostrar "de onde para onde" cada perna vai.
 *
 * `romaneioId` presente significa que o trecho ja tem documento; a tela troca
 * "Emitir" por "Abrir" em vez de deixar o usuario bater na regra de unicidade.
 */
@Schema(description = "Trecho da rota e o estado do seu romaneio")
public record ManifestStageResponse(
    Integer etapaId,
    Short ordem,
    @Schema(description = "Ponto de partida do trecho; derivado do trecho anterior")
    String origem,
    String destino,
    BigDecimal kmTrecho,
    BigDecimal cargaKg,
    LocalDateTime previstoEm,
    LocalDateTime realizadoEm,
    @Schema(description = "Chegada registrada; so trecho concluido emite romaneio")
    boolean concluido,
    @Schema(description = "Ausente quando o trecho ainda nao tem romaneio")
    Integer romaneioId
) {
}
