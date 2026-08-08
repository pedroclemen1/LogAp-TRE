package br.com.logap.logitrack.trip.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import br.com.logap.logitrack.trip.Trip;
import br.com.logap.logitrack.trip.TripStatus;
import br.com.logap.logitrack.vehicle.VehicleType;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Viagem, com status calculado a partir das datas")
public record TripResponse(
    Integer id,
    Integer veiculoId,
    String veiculoPlaca,
    String veiculoModelo,
    VehicleType veiculoTipo,
    Integer motoristaId,
    String motoristaNome,
    LocalDateTime dataSaida,
    LocalDateTime iniciadaEm,
    LocalDateTime dataChegadaPrevista,
    LocalDateTime dataChegada,
    String origem,
    String destino,
    BigDecimal kmPercorrida,
    BigDecimal cargaKg,
    LocalDateTime canceladaEm,
    @Schema(description = "Derivado dos fatos de inicio, chegada e cancelamento")
    TripStatus status,

    /**
     * Cidades da rota na ordem, SEM a origem: [parada1, parada2, ..., destino].
     *
     * Existe porque a listagem mostrava apenas "origem -> destino" e escondia as
     * paradas do meio. Preenchido so em `list()`, onde os trechos de toda a
     * pagina sao buscados de uma vez; nas respostas de item unico vem nulo e
     * SOME do JSON (default-property-inclusion: non_null), porque ali quem tem o
     * detalhe da rota e o endpoint /detalhes.
     */
    @Schema(description = "Paradas e destino na ordem da rota; ausente fora da listagem")
    List<String> rota
) {
    public static TripResponse from(Trip t) {
        return from(t, null);
    }

    public static TripResponse from(Trip t, List<String> rota) {
        return new TripResponse(
            t.getId(),
            t.getVeiculo().getId(),
            t.getVeiculo().getPlaca(),
            t.getVeiculo().getModelo(),
            t.getVeiculo().getTipo(),
            t.getMotorista() != null ? t.getMotorista().getId() : null,
            t.getMotorista() != null ? t.getMotorista().getNome() : null,
            t.getDataSaida(),
            t.getIniciadaEm(),
            t.getDataChegadaPrevista(),
            t.getDataChegada(),
            t.getOrigem(),
            t.getDestino(),
            t.getKmPercorrida(),
            t.getCargaKg(),
            t.getCanceladaEm(),
            t.getStatus(),
            rota);
    }
}
