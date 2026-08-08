package br.com.logap.logitrack.manifest.dto;

import java.math.BigDecimal;

import br.com.logap.logitrack.manifest.ManifestItem;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Item impresso na tabela de carga")
public record ManifestItemResponse(
    Integer id,
    Short sequencia,
    String notaFiscal,
    String destinatario,
    Integer volumes,
    BigDecimal pesoKg
) {
    public static ManifestItemResponse from(ManifestItem item) {
        return new ManifestItemResponse(
            item.getId(), item.getSequencia(), item.getNotaFiscal(),
            item.getDestinatario(), item.getVolumes(), item.getPesoKg());
    }
}
