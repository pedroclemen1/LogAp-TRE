package br.com.logap.logitrack.vehicle.dto;

import java.math.BigDecimal;

import br.com.logap.logitrack.vehicle.Vehicle;
import br.com.logap.logitrack.vehicle.VehicleOperationalStatus;
import br.com.logap.logitrack.vehicle.VehicleType;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Veiculo da frota")
public record VehicleResponse(
    Integer id,
    @Schema(example = "ABC-1234") String placa,
    @Schema(example = "Fiorino") String modelo,
    VehicleType tipo,
    Integer ano,
    @Schema(description = "Hodometro informado no cadastro", example = "44000.00") BigDecimal kmInicial,
    @Schema(description = "Rotulo pronto para exibicao: placa e modelo") String descricao,
    @Schema(description = "Indica reserva por uma viagem em andamento") boolean emUso,
    @Schema(description = "Situacao operacional atual") VehicleOperationalStatus statusOperacional
) {
    public static VehicleResponse from(Vehicle v, VehicleOperationalStatus status) {
        return new VehicleResponse(
            v.getId(), v.getPlaca(), v.getModelo(), v.getTipo(), v.getAno(), v.getKmInicial(),
            "%s - %s".formatted(v.getPlaca(), v.getModelo()),
            status == VehicleOperationalStatus.EM_USO,
            status);
    }
}
