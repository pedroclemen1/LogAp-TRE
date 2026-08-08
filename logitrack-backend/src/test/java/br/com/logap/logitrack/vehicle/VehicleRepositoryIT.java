package br.com.logap.logitrack.vehicle;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;

import br.com.logap.logitrack.support.IntegrationTest;
import br.com.logap.logitrack.support.SqlFixtures;
import br.com.logap.logitrack.vehicle.projection.FleetVehicleView;

/**
 * As 4 consultas nativas de `VehicleRepository` contra Postgres real.
 *
 * Motivo de nao usar H2: `LEFT JOIN LATERAL`, `FILTER (WHERE ...)`, CTE e os
 * indices parciais que a V2/V5 criam. H2 nao reproduz esse conjunto — o teste
 * passaria sem provar que a consulta funciona onde ela roda de verdade.
 */
class VehicleRepositoryIT extends IntegrationTest {

    private static final LocalDate HOJE = LocalDate.now();
    private static final LocalDateTime ONTEM = LocalDateTime.now().minusDays(1);

    @Autowired
    private VehicleRepository repository;

    @Autowired
    private SqlFixtures fixtures;

    @BeforeEach
    void limpar() {
        databaseCleaner.clean();
    }

    private List<FleetVehicleView> frota() {
        return repository.findFleetPage(null, null, null, PageRequest.of(0, 50)).getContent();
    }

    private FleetVehicleView frotaPorPlaca(String placa) {
        return frota().stream().filter(v -> v.getPlaca().equals(placa)).findFirst().orElseThrow();
    }

    @Nested
    @DisplayName("derivacao de status pelo CASE")
    class Status {

        @Test
        void semViagemNemManutencaoFicaDisponivel() {
            fixtures.veiculo("AAA-0001", "Fiorino", "LEVE", 2022, "1000.00");

            assertThat(frotaPorPlaca("AAA-0001").getStatus()).isEqualTo("DISPONIVEL");
        }

        @Test
        void viagemIniciadaEAbertaFicaEmUso() {
            int veiculo = fixtures.veiculo("AAA-0002", "Volvo", "PESADO", 2023, "0.00");
            fixtures.viagemEmAndamento(veiculo, null, ONTEM, "100.00");

            assertThat(frotaPorPlaca("AAA-0002").getStatus()).isEqualTo("EM_USO");
        }

        @Test
        void manutencaoEmRealizacaoFicaEmManutencao() {
            int veiculo = fixtures.veiculo("AAA-0003", "Scania", "PESADO", 2021, "0.00");
            fixtures.manutencaoEmRealizacao(veiculo, HOJE.minusDays(1), HOJE.plusDays(1));

            assertThat(frotaPorPlaca("AAA-0003").getStatus()).isEqualTo("MANUTENCAO");
        }

        /**
         * A ORDEM DOS RAMOS DO CASE E REGRA DE NEGOCIO, nao detalhe: com o
         * veiculo simultaneamente em viagem aberta e em manutencao, manutencao
         * vence. Inverter os ramos passaria despercebido sem este teste.
         */
        @Test
        void manutencaoVenceViagemAberta() {
            int veiculo = fixtures.veiculo("AAA-0004", "Sprinter", "LEVE", 2020, "0.00");
            fixtures.viagemEmAndamento(veiculo, null, ONTEM, "100.00");
            fixtures.manutencaoEmRealizacao(veiculo, HOJE.minusDays(1), HOJE.plusDays(1));

            assertThat(frotaPorPlaca("AAA-0004").getStatus()).isEqualTo("MANUTENCAO");
        }

        @Test
        void viagemProgramadaNaoMarcaEmUso() {
            int veiculo = fixtures.veiculo("AAA-0005", "Fiorino", "LEVE", 2022, "0.00");
            fixtures.viagemProgramada(veiculo, LocalDateTime.now().plusDays(2), "100.00");

            assertThat(frotaPorPlaca("AAA-0005").getStatus()).isEqualTo("DISPONIVEL");
        }

        @Test
        void viagemCanceladaNaoMarcaEmUso() {
            int veiculo = fixtures.veiculo("AAA-0006", "Fiorino", "LEVE", 2022, "0.00");
            fixtures.viagemCancelada(veiculo, ONTEM, "100.00");

            assertThat(frotaPorPlaca("AAA-0006").getStatus()).isEqualTo("DISPONIVEL");
        }

        @Test
        void manutencaoConcluidaNaoMarcaEmManutencao() {
            int veiculo = fixtures.veiculo("AAA-0007", "Scania", "PESADO", 2021, "0.00");
            fixtures.manutencaoConcluida(veiculo, HOJE.minusDays(5), HOJE.minusDays(4));

            assertThat(frotaPorPlaca("AAA-0007").getStatus()).isEqualTo("DISPONIVEL");
        }
    }

    @Nested
    @DisplayName("hodometro e LEFT JOIN LATERAL")
    class Odometro {

        /**
         * Veiculo recem-cadastrado tem de aparecer na Frota, com hodometro
         * igual ao km inicial e sem ultima viagem.
         *
         * NOTA sobre o LEFT do JOIN LATERAL: teste de mutacao mostrou que
         * trocar por INNER NAO quebra nada — as laterais sao agregadas sem
         * GROUP BY, entao sempre devolvem uma linha. O LEFT e defensivo para o
         * dia em que alguem adicionar uma coluna nao agregada ali. Esta
         * assercao cobre o comportamento visivel, nao a escolha do tipo de JOIN.
         */
        @Test
        void veiculoQueNuncaRodouApareceNaFrota() {
            fixtures.veiculo("BBB-0001", "Novo", "LEVE", 2026, "0.00");

            assertThat(frota()).extracting(FleetVehicleView::getPlaca).contains("BBB-0001");
            assertThat(frotaPorPlaca("BBB-0001").getUltimaViagemEm()).isNull();
        }

        @Test
        void hodometroSomaKmInicialComViagensConcluidas() {
            int veiculo = fixtures.veiculo("BBB-0002", "Volvo", "PESADO", 2023, "1000.00");
            fixtures.viagemConcluida(veiculo, ONTEM.minusDays(3), ONTEM.minusDays(3).plusHours(5), "435.00");
            fixtures.viagemConcluida(veiculo, ONTEM.minusDays(2), ONTEM.minusDays(2).plusHours(2), "64.50");

            assertThat(frotaPorPlaca("BBB-0002").getOdometroKm()).isEqualByComparingTo("1499.50");
        }

        /** `FILTER (WHERE data_chegada IS NOT NULL)`: km so vira hodometro quando a chegada e registrada. */
        @Test
        void viagemEmAndamentoNaoSomaNoHodometro() {
            int veiculo = fixtures.veiculo("BBB-0003", "Volvo", "PESADO", 2023, "1000.00");
            fixtures.viagemEmAndamento(veiculo, null, ONTEM, "500.00");

            assertThat(frotaPorPlaca("BBB-0003").getOdometroKm()).isEqualByComparingTo("1000.00");
        }

        @Test
        void viagemCanceladaNaoSomaNoHodometro() {
            int veiculo = fixtures.veiculo("BBB-0004", "Volvo", "PESADO", 2023, "1000.00");
            fixtures.viagemCancelada(veiculo, ONTEM, "500.00");

            assertThat(frotaPorPlaca("BBB-0004").getOdometroKm()).isEqualByComparingTo("1000.00");
        }

        /** Hodometro e ultima viagem saem do MESMO agregado — um LATERAL, nao dois. */
        @Test
        void ultimaViagemEAPartidaMaisRecenteJaIniciada() {
            int veiculo = fixtures.veiculo("BBB-0005", "Volvo", "PESADO", 2023, "0.00");
            LocalDateTime antiga = ONTEM.minusDays(10).withNano(0);
            LocalDateTime recente = ONTEM.minusDays(2).withNano(0);
            fixtures.viagemConcluida(veiculo, antiga, antiga.plusHours(3), "100.00");
            fixtures.viagemConcluida(veiculo, recente, recente.plusHours(3), "200.00");

            assertThat(frotaPorPlaca("BBB-0005").getUltimaViagemEm()).isEqualTo(recente);
        }
    }

    @Nested
    @DisplayName("agenda de manutencao")
    class Agenda {

        @Test
        void proximaManutencaoEAMaisAntigaNaoConcluida() {
            int veiculo = fixtures.veiculo("CCC-0001", "Volvo", "PESADO", 2023, "0.00");
            fixtures.manutencaoPendente(veiculo, HOJE.plusDays(10), HOJE.plusDays(11));
            fixtures.manutencaoPendente(veiculo, HOJE.plusDays(3), HOJE.plusDays(4));

            assertThat(frotaPorPlaca("CCC-0001").getProximaManutencaoEm()).isEqualTo(HOJE.plusDays(3));
            assertThat(frotaPorPlaca("CCC-0001").getManutencaoAtrasada()).isFalse();
        }

        @Test
        void manutencaoComInicioNoPassadoMarcaAtrasada() {
            int veiculo = fixtures.veiculo("CCC-0002", "Volvo", "PESADO", 2023, "0.00");
            fixtures.manutencaoPendente(veiculo, HOJE.minusDays(2), HOJE.plusDays(1));

            assertThat(frotaPorPlaca("CCC-0002").getManutencaoAtrasada()).isTrue();
        }

        @Test
        void semManutencaoAbertaNaoAtrasaENaoTemProxima() {
            int veiculo = fixtures.veiculo("CCC-0003", "Volvo", "PESADO", 2023, "0.00");
            fixtures.manutencaoConcluida(veiculo, HOJE.minusDays(9), HOJE.minusDays(8));

            assertThat(frotaPorPlaca("CCC-0003").getProximaManutencaoEm()).isNull();
            assertThat(frotaPorPlaca("CCC-0003").getManutencaoAtrasada()).isFalse();
        }
    }

    @Nested
    @DisplayName("filtros")
    class Filtros {

        /**
         * O filtro de status fica FORA do CTE porque status nao e coluna — so
         * existe depois do CASE. Este teste confirma que filtrar no SQL devolve
         * o mesmo conjunto que filtrar em memoria.
         */
        @Test
        void filtroDeStatusEquivaleAFiltrarEmMemoria() {
            int emUso = fixtures.veiculo("DDD-0001", "Volvo", "PESADO", 2023, "0.00");
            fixtures.viagemEmAndamento(emUso, null, ONTEM, "10.00");
            int manutencao = fixtures.veiculo("DDD-0002", "Scania", "PESADO", 2023, "0.00");
            fixtures.manutencaoEmRealizacao(manutencao, HOJE, HOJE.plusDays(1));
            fixtures.veiculo("DDD-0003", "Fiorino", "LEVE", 2023, "0.00");

            List<String> viaSql = repository.findFleetPage(null, null, "EM_USO", PageRequest.of(0, 50))
                .getContent().stream().map(FleetVehicleView::getPlaca).toList();
            List<String> viaMemoria = frota().stream()
                .filter(v -> v.getStatus().equals("EM_USO")).map(FleetVehicleView::getPlaca).toList();

            assertThat(viaSql).isEqualTo(viaMemoria).containsExactly("DDD-0001");
        }

        /** A contagem tem SQL proprio (sem os LATERAL) e precisa concordar com a pagina. */
        @Test
        void contagemConcordaComOConteudoQuandoFiltraPorStatus() {
            int manutencao = fixtures.veiculo("DDD-0004", "Scania", "PESADO", 2023, "0.00");
            fixtures.manutencaoEmRealizacao(manutencao, HOJE, HOJE.plusDays(1));
            fixtures.veiculo("DDD-0005", "Fiorino", "LEVE", 2023, "0.00");

            var page = repository.findFleetPage(null, null, "MANUTENCAO", PageRequest.of(0, 50));

            assertThat(page.getTotalElements()).isEqualTo(1);
            assertThat(page.getContent()).hasSize(1);
        }

        @Test
        void buscaCasaPlacaOuModeloSemDiferenciarCaixa() {
            fixtures.veiculo("EEE-0001", "Volvo FH", "PESADO", 2023, "0.00");
            fixtures.veiculo("EEE-0002", "Fiorino", "LEVE", 2023, "0.00");

            assertThat(repository.findFleetPage("%volvo%", null, null, PageRequest.of(0, 50)).getContent())
                .extracting(FleetVehicleView::getPlaca).containsExactly("EEE-0001");
            assertThat(repository.findFleetPage("%eee-0002%", null, null, PageRequest.of(0, 50)).getContent())
                .extracting(FleetVehicleView::getPlaca).containsExactly("EEE-0002");
        }

        @Test
        void filtroDeTipoUsaAColunaReal() {
            fixtures.veiculo("EEE-0003", "Volvo FH", "PESADO", 2023, "0.00");
            fixtures.veiculo("EEE-0004", "Fiorino", "LEVE", 2023, "0.00");

            assertThat(repository.findFleetPage(null, "LEVE", null, PageRequest.of(0, 50)).getContent())
                .extracting(FleetVehicleView::getPlaca).containsExactly("EEE-0004");
        }
    }

    @Nested
    @DisplayName("bloqueio de exclusao por historico")
    class Historico {

        /** Cada vínculo histórico deve bloquear sozinho. */
        @Test
        void viagemBloqueia() {
            int veiculo = fixtures.veiculo("FFF-0001", "Volvo", "PESADO", 2023, "0.00");
            fixtures.viagemProgramada(veiculo, LocalDateTime.now().plusDays(1), "10.00");

            assertThat(repository.findPlatesWithHistory(List.of(veiculo))).containsExactly("FFF-0001");
        }

        @Test
        void manutencaoBloqueia() {
            int veiculo = fixtures.veiculo("FFF-0002", "Volvo", "PESADO", 2023, "0.00");
            fixtures.manutencaoPendente(veiculo, HOJE.plusDays(1), HOJE.plusDays(2));

            assertThat(repository.findPlatesWithHistory(List.of(veiculo))).containsExactly("FFF-0002");
        }

        @Test
        void veiculoSemHistoricoNaoBloqueia() {
            int veiculo = fixtures.veiculo("FFF-0003", "Volvo", "PESADO", 2023, "0.00");

            assertThat(repository.findPlatesWithHistory(List.of(veiculo))).isEmpty();
        }
    }

    @Nested
    @DisplayName("conjuntos de ids operacionais")
    class Conjuntos {

        @Test
        void idsEmUsoTrazemSoViagemIniciadaEAberta() {
            int emUso = fixtures.veiculo("GGG-0001", "Volvo", "PESADO", 2023, "0.00");
            fixtures.viagemEmAndamento(emUso, null, ONTEM, "10.00");
            int programada = fixtures.veiculo("GGG-0002", "Volvo", "PESADO", 2023, "0.00");
            fixtures.viagemProgramada(programada, LocalDateTime.now().plusDays(1), "10.00");
            int cancelada = fixtures.veiculo("GGG-0003", "Volvo", "PESADO", 2023, "0.00");
            fixtures.viagemCancelada(cancelada, ONTEM, "10.00");

            assertThat(repository.findIdsInUse()).containsExactly(emUso);
        }

        @Test
        void idsEmManutencaoTrazemSoEmRealizacao() {
            int ativa = fixtures.veiculo("GGG-0004", "Volvo", "PESADO", 2023, "0.00");
            fixtures.manutencaoEmRealizacao(ativa, HOJE, HOJE.plusDays(1));
            int pendente = fixtures.veiculo("GGG-0005", "Volvo", "PESADO", 2023, "0.00");
            fixtures.manutencaoPendente(pendente, HOJE.plusDays(1), HOJE.plusDays(2));

            assertThat(repository.findIdsInMaintenance()).containsExactly(ativa);
        }
    }
}
