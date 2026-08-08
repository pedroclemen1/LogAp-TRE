package br.com.logap.logitrack.manifest.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import br.com.logap.logitrack.manifest.Manifest;
import io.swagger.v3.oas.annotations.media.Schema;

/** Linha da aba "Romaneios emitidos": o suficiente para a tabela, sem os itens. */
@Schema(description = "Resumo de romaneio emitido")
public record ManifestSummaryResponse(
    Integer id,
    Integer viagemId,
    String numero,
    LocalDateTime emitidoEm,
    String veiculoPlaca,
    String motoristaNome,
    String origemNome,
    String destinoNome,
    Integer totalVolumes,
    BigDecimal totalPesoKg
) {
    public static ManifestSummaryResponse from(Manifest m) {
        return new ManifestSummaryResponse(
            m.getId(), m.getViagem().getId(), m.getNumero(), m.getEmitidoEm(),
            m.getVeiculoPlaca(), m.getMotoristaNome(),
            m.getOrigemNome(), m.getDestinoNome(),
            m.totalVolumes(), m.totalPesoKg());
    }
}
