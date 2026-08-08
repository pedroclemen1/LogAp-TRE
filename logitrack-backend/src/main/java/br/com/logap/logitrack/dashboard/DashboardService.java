package br.com.logap.logitrack.dashboard;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.List;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.logap.logitrack.dashboard.dto.CategoryVolumeResponse;
import br.com.logap.logitrack.dashboard.dto.DailyDistanceResponse;
import br.com.logap.logitrack.dashboard.dto.DashboardResponse;
import br.com.logap.logitrack.dashboard.dto.ScheduledMaintenanceResponse;
import br.com.logap.logitrack.dashboard.dto.VehicleUsageResponse;
import br.com.logap.logitrack.dashboard.projection.DailyDistanceView;
import br.com.logap.logitrack.shared.BusinessRuleException;
import br.com.logap.logitrack.vehicle.VehicleType;

@Service
@Transactional(readOnly = true)
public class DashboardService {

    private final DashboardRepository repository;
    private final Clock clock;

    public DashboardService(DashboardRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    public DashboardResponse build(Integer veiculoId, Integer dias, VehicleType tipo) {
        validatePeriod(dias);
        LocalDate today = LocalDate.now(clock);
        LocalDate startDate = dias == null ? null : today.minusDays(dias - 1L);
        LocalDateTime start = startDate == null ? null : startDate.atStartOfDay();
        LocalDateTime endExclusive = dias == null ? null : today.plusDays(1).atStartOfDay();
        String vehicleType = tipo == null ? null : tipo.name();

        List<VehicleUsageResponse> ranking = repository.rankingUtilizacao(start, endExclusive, vehicleType).stream()
            .map(VehicleUsageResponse::from)
            .toList();

        List<CategoryVolumeResponse> volumes = repository.volumePorCategoria(start, endExclusive, vehicleType).stream()
            .map(CategoryVolumeResponse::from)
            .toList();

        List<ScheduledMaintenanceResponse> agenda = repository.proximasManutencoes(vehicleType).stream()
            .map(ScheduledMaintenanceResponse::from)
            .toList();

        return new DashboardResponse(
            repository.totalKm(veiculoId, start, endExclusive, vehicleType),
            volumes,
            agenda,
            ranking,
            ranking.isEmpty() ? null : ranking.getFirst(),
            repository.projecaoFinanceiraMesAtual(vehicleType),
            dias,
            startDate,
            dias == null ? null : today,
            buildDailySeries(veiculoId, startDate, today, start, endExclusive, vehicleType));
    }

    private List<DailyDistanceResponse> buildDailySeries(Integer veiculoId, LocalDate startDate,
                                                         LocalDate endDate, LocalDateTime start,
                                                         LocalDateTime endExclusive, String tipo) {
        if (startDate == null) return List.of();
        Map<LocalDate, DailyDistanceView> values = repository
            .distanciaPorDia(veiculoId, start, endExclusive, tipo).stream()
            .collect(Collectors.toMap(DailyDistanceView::getData, Function.identity()));
        return startDate.datesUntil(endDate.plusDays(1))
            .map(date -> new DailyDistanceResponse(
                date,
                values.containsKey(date) ? values.get(date).getTotalKm() : BigDecimal.ZERO))
            .toList();
    }

    private static void validatePeriod(Integer dias) {
        if (dias != null && dias != 7 && dias != 30) {
            throw new BusinessRuleException("O periodo do dashboard deve ser de 7 ou 30 dias.");
        }
    }
}
