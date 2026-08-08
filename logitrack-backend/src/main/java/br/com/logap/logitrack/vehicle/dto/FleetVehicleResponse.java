package br.com.logap.logitrack.vehicle.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import br.com.logap.logitrack.vehicle.VehicleOperationalStatus;
import br.com.logap.logitrack.vehicle.VehicleType;
import br.com.logap.logitrack.vehicle.projection.FleetVehicleView;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Veiculo com os indicadores operacionais da tela de Frota")
public record FleetVehicleResponse(

    Integer id,

    @Schema(example = "ABC-1234") String placa,

    @Schema(example = "Fiorino") String modelo,

    VehicleType tipo,

    Integer ano,

    @Schema(description = "Hodometro informado no cadastro", example = "44000.00")
    BigDecimal kmInicial,

    @Schema(description = "Hodometro atual: kmInicial mais a soma das viagens concluidas",
        example = "44455.50")
    BigDecimal odometroKm,

    @Schema(description = "Partida da viagem mais recente; ausente se o veiculo nunca rodou")
    LocalDateTime ultimaViagemEm,

    @Schema(description = "Inicio da proxima manutencao nao concluida; ausente se nao houver")
    LocalDate proximaManutencaoEm,

    @Schema(description = "A proxima manutencao ja deveria ter comecado")
    boolean manutencaoAtrasada,

    @Schema(description = "Derivado por SQL; nao existe coluna de status na tabela")
    VehicleOperationalStatus status
) {

    public static FleetVehicleResponse from(FleetVehicleView view) {
        return new FleetVehicleResponse(
            view.getId(),
            view.getPlaca(),
            view.getModelo(),
            VehicleType.valueOf(view.getTipo()),
            view.getAno(),
            view.getKmInicial(),
            view.getOdometroKm(),
            view.getUltimaViagemEm(),
            view.getProximaManutencaoEm(),
            Boolean.TRUE.equals(view.getManutencaoAtrasada()),
            VehicleOperationalStatus.valueOf(view.getStatus()));
    }
}
