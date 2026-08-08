package br.com.logap.logitrack.performance;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Supplier;

import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;

import br.com.logap.logitrack.driver.DriverService;
import br.com.logap.logitrack.maintenance.MaintenanceService;
import br.com.logap.logitrack.maintenance.catalog.MaintenanceServiceCatalogService;
import br.com.logap.logitrack.manifest.ManifestService;
import br.com.logap.logitrack.support.IntegrationTest;
import br.com.logap.logitrack.support.SqlFixtures;
import br.com.logap.logitrack.trip.TripService;
import br.com.logap.logitrack.vehicle.VehicleService;
import jakarta.persistence.EntityManagerFactory;

class NPlusOneQueryIT extends IntegrationTest {

    private static final LocalDateTime AMANHA = LocalDateTime.now().plusDays(1).withNano(0);

    @Autowired
    private EntityManagerFactory entityManagerFactory;

    @Autowired
    private SqlFixtures fixtures;

    @Autowired
    private TripService tripService;

    @Autowired
    private ManifestService manifestService;

    @Autowired
    private MaintenanceService maintenanceService;

    @Autowired
    private MaintenanceServiceCatalogService catalogService;

    @Autowired
    private VehicleService vehicleService;

    @Autowired
    private DriverService driverService;

    private Statistics statistics;

    @BeforeEach
    void preparar() {
        databaseCleaner.clean();
        statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
        statistics.setStatisticsEnabled(true);
    }

    @AfterEach
    void desabilitarEstatisticas() {
        statistics.setStatisticsEnabled(false);
    }

    @Test
    void listaDeViagensUsaOrcamentoFixoDeConsultas() {
        int veiculo = fixtures.veiculo("NQP-1000", "Volvo", "PESADO", 2023, "0.00");
        for (int index = 0; index < 5; index++) {
            int viagem = fixtures.viagemProgramada(veiculo, AMANHA.plusDays(index), "10.00");
            fixtures.etapa(viagem, 1, "Destino " + index, "10.00", "100.00");
        }

        long consultas = contar(() -> tripService.list(null, null, null, PageRequest.of(0, 3)));

        assertThat(consultas).isLessThanOrEqualTo(3);
    }

    @Test
    void candidatosDeRomaneioCarregamTrechosEmLote() {
        int veiculo = fixtures.veiculo("NQP-2000", "Scania", "PESADO", 2023, "0.00");
        for (int index = 0; index < 5; index++) {
            int viagem = fixtures.viagemProgramada(veiculo, AMANHA.plusDays(index), "10.00");
            fixtures.etapa(viagem, 1, "Destino " + index, "10.00", "100.00");
        }

        long consultas = contar(() -> manifestService.listCandidates(
            null, null, null, PageRequest.of(0, 3)));

        assertThat(consultas).isLessThanOrEqualTo(4);
    }

    @Test
    void listaDeManutencoesCarregaVeiculoEServicosEmLote() {
        int veiculo = fixtures.veiculo("NQP-3000", "Mercedes", "PESADO", 2023, "0.00");
        int servico = fixtures.servicoCatalogo("Revisao");
        for (int index = 0; index < 5; index++) {
            int manutencao = fixtures.manutencaoPendente(
                veiculo, LocalDate.now().plusDays(index + 1L), LocalDate.now().plusDays(index + 2L));
            fixtures.servicoDaManutencao(manutencao, servico, "100.00");
        }

        long consultas = contar(() -> maintenanceService.list(
            null, null, null, null, null, null, null, PageRequest.of(0, 3)));

        assertThat(consultas).isLessThanOrEqualTo(3);
    }

    @Test
    void listaDeVeiculosTemQuantidadeFixaDeConsultas() {
        for (int index = 0; index < 5; index++) {
            fixtures.veiculo("NQV-%04d".formatted(index), "Modelo " + index, "LEVE", 2023, "0.00");
        }

        long consultas = contar(vehicleService::listAll);

        assertThat(consultas).isLessThanOrEqualTo(3);
    }

    @Test
    void listaDeMotoristasTemQuantidadeFixaDeConsultas() {
        for (int index = 0; index < 5; index++) {
            fixtures.motorista("Motorista " + index, "123456%05d".formatted(index));
        }

        long consultas = contar(() -> driverService.list(null, null));

        assertThat(consultas).isLessThanOrEqualTo(2);
    }

    @Test
    void catalogoCarregaVariosServicosEmUmaConsulta() {
        List<Integer> ids = new ArrayList<>();
        for (int index = 0; index < 5; index++) {
            ids.add(fixtures.servicoCatalogo("Servico " + index));
        }

        long consultas = contar(() -> catalogService.getActiveEntities(ids));

        assertThat(consultas).isEqualTo(1);
    }

    private long contar(Supplier<?> operation) {
        statistics.clear();
        operation.get();
        return statistics.getPrepareStatementCount();
    }
}
