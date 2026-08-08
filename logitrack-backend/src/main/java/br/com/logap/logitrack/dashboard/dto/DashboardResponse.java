package br.com.logap.logitrack.dashboard.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Metricas operacionais do painel analitico")
public record DashboardResponse(
    @Schema(description = "Metrica 1 — soma de km da frota ou do veiculo filtrado")
    BigDecimal totalKm,

    @Schema(description = "Metrica 2 — viagens e km por tipo de veiculo (LEVE x PESADO)")
    List<CategoryVolumeResponse> volumePorCategoria,

    @Schema(description = "Metrica 3 — as proximas 5 manutencoes agendadas")
    List<ScheduledMaintenanceResponse> proximasManutencoes,

    @Schema(description = "Metrica 4 — veiculos por quilometragem acumulada, do maior para o menor")
    List<VehicleUsageResponse> rankingUtilizacao,

    @Schema(description = "Metrica 4 — o veiculo de maior quilometragem acumulada")
    VehicleUsageResponse veiculoMaisUtilizado,

    @Schema(description = "Metrica 5 — custo estimado de manutencao no mes corrente")
    BigDecimal projecaoFinanceiraMesAtual,

    @Schema(description = "Quantidade de dias aplicada as metricas historicas; nula preserva a consulta acumulada")
    Integer periodoDias,

    LocalDate inicioPeriodo,

    LocalDate fimPeriodo,

    @Schema(description = "Quilometragem concluida por dia, incluindo dias sem movimento")
    List<DailyDistanceResponse> serieKmPorDia
) {
}
