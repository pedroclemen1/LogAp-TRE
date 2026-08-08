package br.com.logap.logitrack.trip;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import br.com.logap.logitrack.shared.BusinessRuleException;
import br.com.logap.logitrack.trip.dto.TripStageRequest;

class TripRouteServiceTest {

    private static final LocalDateTime DEPARTURE = LocalDateTime.of(2026, 8, 7, 8, 0);

    private TripStageRepository repository;
    private TripRouteService service;

    @BeforeEach
    void setUp() {
        repository = mock(TripStageRepository.class);
        service = new TripRouteService(repository);
    }

    @Test
    void summarizesValuesDerivedFromStages() {
        LocalDateTime firstArrival = DEPARTURE.plusHours(2);
        LocalDateTime finalArrival = DEPARTURE.plusHours(5);

        var summary = service.summarize(DEPARTURE, List.of(
            stage(null, "Campinas", "10.50", "700.00", firstArrival),
            stage(null, " Santos ", "20.25", "500.00", finalArrival)));

        assertThat(summary.destination()).isEqualTo("Santos");
        assertThat(summary.totalKm()).isEqualByComparingTo("30.75");
        assertThat(summary.initialLoad()).isEqualByComparingTo("700.00");
        assertThat(summary.expectedArrival()).isEqualTo(finalArrival);
    }

    @Test
    void rejectsArrivalBeforeDeparture() {
        assertThatThrownBy(() -> service.summarize(DEPARTURE, List.of(
            stage(null, "Campinas", "10.00", "100.00", DEPARTURE.minusMinutes(1)))))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessage("A previsao do trecho 1 nao pode ser anterior a partida.");
    }

    @Test
    void rejectsArrivalsOutsideRouteOrder() {
        assertThatThrownBy(() -> service.summarize(DEPARTURE, List.of(
            stage(null, "Campinas", "10.00", "100.00", DEPARTURE.plusHours(2)),
            stage(null, "Santos", "10.00", "90.00", DEPARTURE.plusHours(1)))))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessage("As previsoes dos trechos devem seguir a ordem da rota.");
    }

    @Test
    void rejectsTotalDistanceOutsideDatabasePrecision() {
        assertThatThrownBy(() -> service.summarize(DEPARTURE, List.of(
            stage(null, "Campinas", "50000000.00", "100.00", null),
            stage(null, "Santos", "50000000.00", "90.00", null))))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessage("A quilometragem total da rota excede o limite permitido.");
    }

    @Test
    void rejectsExistingStageIdBeforePersistenceOnCreation() {
        assertThatThrownBy(() -> service.summarizeForCreation(DEPARTURE, List.of(
            stage(42, "Campinas", "10.00", "100.00", null))))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessage("Trechos novos nao podem informar id.");

        verifyNoInteractions(repository);
    }

    private static TripStageRequest stage(Integer id, String destination, String km,
                                          String load, LocalDateTime expectedArrival) {
        return new TripStageRequest(
            id, destination, new BigDecimal(km), new BigDecimal(load), expectedArrival);
    }
}
