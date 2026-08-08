package br.com.logap.logitrack.manifest.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import br.com.logap.logitrack.manifest.Manifest;
import io.swagger.v3.oas.annotations.media.Schema;

/** Documento completo, como impresso. */
@Schema(description = "Romaneio de carga")
public record ManifestResponse(
    Integer id,
    Integer viagemId,
    Integer viagemEtapaId,
    Short trechoOrdem,
    String numero,
    LocalDateTime emitidoEm,
    String emitidoPor,
    String autenticacao,

    String transportadoraRazaoSocial,
    String transportadoraCnpj,
    String transportadoraAntt,

    String motoristaNome,
    String motoristaCnh,
    String veiculoPlaca,
    String veiculoDescricao,

    String origemNome,
    String origemEndereco,
    String destinoNome,
    String destinoEndereco,
    BigDecimal distanciaKm,

    List<ManifestItemResponse> itens,
    @Schema(description = "Soma da coluna Qtd. Vol.")
    Integer totalVolumes,
    @Schema(description = "Soma da coluna Peso (kg)")
    BigDecimal totalPesoKg
) {
    public static ManifestResponse from(Manifest m) {
        return new ManifestResponse(
            m.getId(),
            m.getViagem().getId(),
            m.getViagemEtapa().getId(),
            m.getTrechoOrdem(),
            m.getNumero(),
            m.getEmitidoEm(),
            m.getEmitidoPor(),
            m.getAutenticacao(),
            m.getTransportadoraRazaoSocial(),
            m.getTransportadoraCnpj(),
            m.getTransportadoraAntt(),
            m.getMotoristaNome(),
            m.getMotoristaCnh(),
            m.getVeiculoPlaca(),
            m.getVeiculoDescricao(),
            m.getOrigemNome(),
            m.getOrigemEndereco(),
            m.getDestinoNome(),
            m.getDestinoEndereco(),
            m.getDistanciaKm(),
            m.getItens().stream().map(ManifestItemResponse::from).toList(),
            m.totalVolumes(),
            m.totalPesoKg());
    }
}
