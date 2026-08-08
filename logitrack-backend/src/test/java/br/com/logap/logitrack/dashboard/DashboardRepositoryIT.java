package br.com.logap.logitrack.dashboard;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.time.LocalDateTime;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import br.com.logap.logitrack.dashboard.projection.CategoryVolumeView;
import br.com.logap.logitrack.dashboard.projection.DailyDistanceView;
import br.com.logap.logitrack.dashboard.projection.ScheduledMaintenanceView;
import br.com.logap.logitrack.dashboard.projection.VehicleUsageView;
import br.com.logap.logitrack.support.IntegrationTest;
import br.com.logap.logitrack.support.SqlFixtures;

/**
 * As 6 consultas nativas do dashboard contra Postgres real.
 *
 * Todos os cenarios usam datas FIXAS e passam o intervalo explicitamente — o
 * resultado nao depende do dia em que a suite roda. As duas consultas que
 * dependem de `CURRENT_DATE` no SQL (projecao do mes) sao ancoradas no mes
 * corrente de proposito e asseridas por diferenca, nao por valor absoluto.
 */
class DashboardRepositoryIT extends IntegrationTest {

    private static final LocalDateTime JANELA_INICIO = LocalDateTime.of(2026, 3, 1, 0, 0);
    private static final LocalDateTime JANELA_FIM = LocalDateTime.of(2026, 3, 8, 0, 0);
    private static final LocalDateTime DENTRO = LocalDateTime.of(2026, 3, 3, 10, 0);
    private static final LocalDateTime FORA_ANTES = LocalDateTime.of(2026, 2, 25, 10, 0);

    @Autowired
    private DashboardRepository repository;

    @Autowired
    private SqlFixtures fixtures;

    @BeforeEach
    void limpar() {
        databaseCleaner.clean();
    }

    @Nested
    @DisplayName("totalKm")
    class TotalKm {

        @Test
        void somaApenasViagensConcluidas() {
            int veiculo = fixtures.veiculo("AAA-1001", "Volvo", "PESADO", 2023, "0.00");
            fixtures.viagemConcluida(veiculo, DENTRO.minusHours(2), DENTRO, "100.00");
            fixtures.viagemEmAndamento(veiculo, null, DENTRO, "999.00");
            fixtures.viagemProgramada(veiculo, DENTRO, "999.00");

            assertThat(repository.totalKm(null, JANELA_INICIO, JANELA_FIM, null))
                .isEqualByComparingTo("100.00");
        }

        @Test
        void ignoraViagemCancelada() {
            int veiculo = fixtures.veiculo("AAA-1002", "Volvo", "PESADO", 2023, "0.00");
            fixtures.viagemConcluida(veiculo, DENTRO.minusHours(2), DENTRO, "100.00");
            fixtures.viagemCancelada(veiculo, DENTRO, "500.00");

            assertThat(repository.totalKm(null, JANELA_INICIO, JANELA_FIM, null))
                .isEqualByComparingTo("100.00");
        }

        /** Intervalo semiaberto: o inicio entra, o fim nao. */
        @Test
        void recorteDePeriodoESemiaberto() {
            int veiculo = fixtures.veiculo("AAA-1003", "Volvo", "PESADO", 2023, "0.00");
            fixtures.viagemConcluida(veiculo, JANELA_INICIO.minusHours(1), JANELA_INICIO, "10.00");
            fixtures.viagemConcluida(veiculo, JANELA_FIM.minusHours(1), JANELA_FIM, "20.00");

            assertThat(repository.totalKm(null, JANELA_INICIO, JANELA_FIM, null))
                .isEqualByComparingTo("10.00");
        }

        @Test
        void filtraPorVeiculoEPorTipo() {
            int pesado = fixtures.veiculo("AAA-1004", "Volvo", "PESADO", 2023, "0.00");
            int leve = fixtures.veiculo("AAA-1005", "Fiorino", "LEVE", 2023, "0.00");
            fixtures.viagemConcluida(pesado, DENTRO.minusHours(2), DENTRO, "300.00");
            fixtures.viagemConcluida(leve, DENTRO.minusHours(2), DENTRO, "70.00");

            assertThat(repository.totalKm(pesado, JANELA_INICIO, JANELA_FIM, null))
                .isEqualByComparingTo("300.00");
            assertThat(repository.totalKm(null, JANELA_INICIO, JANELA_FIM, "LEVE"))
                .isEqualByComparingTo("70.00");
            assertThat(repository.totalKm(null, JANELA_INICIO, JANELA_FIM, null))
                .isEqualByComparingTo("370.00");
        }

        @Test
        void semDadosDevolveZeroENaoNulo() {
            assertThat(repository.totalKm(null, JANELA_INICIO, JANELA_FIM, null))
                .isEqualByComparingTo("0");
        }
    }

    @Nested
    @DisplayName("volumePorCategoria")
    class VolumePorCategoria {

        /**
         * LEFT JOIN: a categoria aparece com zero mesmo sem viagem no periodo.
         * Com INNER, o grafico perderia a barra da categoria ociosa.
         */
        @Test
        void categoriaSemViagemNoPeriodoApareceComZero() {
            int pesado = fixtures.veiculo("BBB-1001", "Volvo", "PESADO", 2023, "0.00");
            fixtures.veiculo("BBB-1002", "Fiorino", "LEVE", 2023, "0.00");
            fixtures.viagemConcluida(pesado, DENTRO.minusHours(2), DENTRO, "200.00");

            var linhas = repository.volumePorCategoria(JANELA_INICIO, JANELA_FIM, null);

            assertThat(linhas).extracting(CategoryVolumeView::getTipo)
                .containsExactly("LEVE", "PESADO");
            assertThat(linhas).filteredOn(l -> l.getTipo().equals("LEVE"))
                .singleElement()
                .satisfies(l -> {
                    assertThat(l.getTotalViagens()).isZero();
                    assertThat(l.getTotalKm()).isEqualByComparingTo("0");
                });
            assertThat(linhas).filteredOn(l -> l.getTipo().equals("PESADO"))
                .singleElement()
                .satisfies(l -> {
                    assertThat(l.getTotalViagens()).isEqualTo(1L);
                    assertThat(l.getTotalKm()).isEqualByComparingTo("200.00");
                });
        }

        @Test
        void viagemForaDoPeriodoNaoConta() {
            int veiculo = fixtures.veiculo("BBB-1003", "Volvo", "PESADO", 2023, "0.00");
            fixtures.viagemConcluida(veiculo, FORA_ANTES.minusHours(2), FORA_ANTES, "500.00");

            assertThat(repository.volumePorCategoria(JANELA_INICIO, JANELA_FIM, null))
                .singleElement()
                .satisfies(l -> assertThat(l.getTotalViagens()).isZero());
        }
    }

    @Nested
    @DisplayName("distanciaPorDia")
    class DistanciaPorDia {

        /** Agrupa pela DATA DE CHEGADA, nao pela de saida. */
        @Test
        void agrupaPelaDataDeChegada() {
            int veiculo = fixtures.veiculo("CCC-1001", "Volvo", "PESADO", 2023, "0.00");
            LocalDateTime saida = LocalDateTime.of(2026, 3, 3, 22, 0);
            LocalDateTime chegada = LocalDateTime.of(2026, 3, 4, 6, 0);
            fixtures.viagemConcluida(veiculo, saida, chegada, "150.00");

            assertThat(repository.distanciaPorDia(null, JANELA_INICIO, JANELA_FIM, null))
                .singleElement()
                .satisfies(d -> {
                    assertThat(d.getData()).isEqualTo(LocalDate.of(2026, 3, 4));
                    assertThat(d.getTotalKm()).isEqualByComparingTo("150.00");
                });
        }

        @Test
        void somaVariasViagensDoMesmoDiaEOrdenaPorData() {
            int veiculo = fixtures.veiculo("CCC-1002", "Volvo", "PESADO", 2023, "0.00");
            LocalDateTime dia5 = LocalDateTime.of(2026, 3, 5, 12, 0);
            LocalDateTime dia3 = LocalDateTime.of(2026, 3, 3, 12, 0);
            fixtures.viagemConcluida(veiculo, dia5.minusHours(3), dia5, "40.00");
            fixtures.viagemConcluida(veiculo, dia5.minusHours(1), dia5.plusHours(1), "60.00");
            fixtures.viagemConcluida(veiculo, dia3.minusHours(1), dia3, "25.00");

            assertThat(repository.distanciaPorDia(null, JANELA_INICIO, JANELA_FIM, null))
                .extracting(DailyDistanceView::getData)
                .containsExactly(LocalDate.of(2026, 3, 3), LocalDate.of(2026, 3, 5));
            assertThat(repository.distanciaPorDia(null, JANELA_INICIO, JANELA_FIM, null))
                .filteredOn(d -> d.getData().equals(LocalDate.of(2026, 3, 5)))
                .singleElement()
                .satisfies(d -> assertThat(d.getTotalKm()).isEqualByComparingTo("100.00"));
        }

        /** Dia sem viagem simplesmente nao volta; quem preenche a lacuna e o service. */
        @Test
        void diaSemViagemNaoApareceNaConsulta() {
            int veiculo = fixtures.veiculo("CCC-1003", "Volvo", "PESADO", 2023, "0.00");
            fixtures.viagemConcluida(veiculo, DENTRO.minusHours(1), DENTRO, "10.00");

            assertThat(repository.distanciaPorDia(null, JANELA_INICIO, JANELA_FIM, null)).hasSize(1);
        }
    }

    @Nested
    @DisplayName("rankingUtilizacao")
    class Ranking {

        @Test
        void ordenaPorKmAcumuladoDecrescente() {
            int a = fixtures.veiculo("DDD-1001", "Volvo", "PESADO", 2023, "0.00");
            int b = fixtures.veiculo("DDD-1002", "Scania", "PESADO", 2023, "0.00");
            fixtures.viagemConcluida(a, DENTRO.minusHours(2), DENTRO, "100.00");
            fixtures.viagemConcluida(b, DENTRO.minusHours(2), DENTRO, "300.00");

            assertThat(repository.rankingUtilizacao(JANELA_INICIO, JANELA_FIM, null))
                .extracting(VehicleUsageView::getPlaca)
                .containsExactly("DDD-1002", "DDD-1001");
        }

        /**
         * O HAVING existe para isto: COM periodo, veiculo sem viagem sai do
         * ranking; SEM periodo (visao geral), ele aparece zerado.
         */
        @Test
        void havingRemoveVeiculoOciosoSoQuandoHaPeriodo() {
            int rodou = fixtures.veiculo("DDD-1003", "Volvo", "PESADO", 2023, "0.00");
            fixtures.veiculo("DDD-1004", "Parado", "PESADO", 2023, "0.00");
            fixtures.viagemConcluida(rodou, DENTRO.minusHours(2), DENTRO, "100.00");

            assertThat(repository.rankingUtilizacao(JANELA_INICIO, JANELA_FIM, null))
                .extracting(VehicleUsageView::getPlaca)
                .containsExactly("DDD-1003");
            assertThat(repository.rankingUtilizacao(null, null, null))
                .extracting(VehicleUsageView::getPlaca)
                .containsExactlyInAnyOrder("DDD-1003", "DDD-1004");
        }

        @Test
        void filtroDeTipoRestringeOConjunto() {
            int pesado = fixtures.veiculo("DDD-1005", "Volvo", "PESADO", 2023, "0.00");
            int leve = fixtures.veiculo("DDD-1006", "Fiorino", "LEVE", 2023, "0.00");
            fixtures.viagemConcluida(pesado, DENTRO.minusHours(2), DENTRO, "100.00");
            fixtures.viagemConcluida(leve, DENTRO.minusHours(2), DENTRO, "500.00");

            assertThat(repository.rankingUtilizacao(JANELA_INICIO, JANELA_FIM, "PESADO"))
                .extracting(VehicleUsageView::getPlaca)
                .containsExactly("DDD-1005");
        }
    }

    /**
     * Esta consulta filtra por `m.data_inicio_prevista >= CURRENT_DATE` no
     * proprio SQL, entao o cenario e ancorado em `LocalDate.now()`. Usar data
     * fixa faria o teste passar hoje e virar vazio depois — o pior tipo de
     * teste, o que apodrece em silencio.
     */
    @Nested
    @DisplayName("proximasManutencoes")
    class Agenda {

        private static final LocalDate HOJE = LocalDate.now();

        @Test
        void trazSoNaoConcluidasComCustoSomado() {
            int veiculo = fixtures.veiculo("EEE-1001", "Volvo", "PESADO", 2023, "0.00");
            int oleo = fixtures.servicoCatalogo("Troca de Oleo");
            int freio = fixtures.servicoCatalogo("Revisao de Freios");

            int pendente = fixtures.manutencaoPendente(veiculo, HOJE.plusDays(10), HOJE.plusDays(11));
            fixtures.servicoDaManutencao(pendente, oleo, "350.00");
            fixtures.servicoDaManutencao(pendente, freio, "150.00");

            int concluida = fixtures.manutencaoConcluida(veiculo, HOJE.plusDays(1), HOJE.plusDays(2));
            fixtures.servicoDaManutencao(concluida, oleo, "999.00");

            var agenda = repository.proximasManutencoes(null);

            assertThat(agenda).singleElement().satisfies(m -> {
                assertThat(m.getId()).isEqualTo(pendente);
                assertThat(m.getCustoEstimado()).isEqualByComparingTo("500.00");
                assertThat(m.getStatus()).isEqualTo("PENDENTE");
                // STRING_AGG concatena os servicos na ordem de insercao.
                assertThat(m.getTipoServico()).isEqualTo("Troca de Oleo, Revisao de Freios");
            });
        }

        /** Manutencao vencida sai da agenda: ela e "proximas", nao "todas as abertas". */
        @Test
        void manutencaoComInicioNoPassadoNaoEntraNaAgenda() {
            int veiculo = fixtures.veiculo("EEE-1003", "Volvo", "PESADO", 2023, "0.00");
            int servico = fixtures.servicoCatalogo("Alinhamento");
            int vencida = fixtures.manutencaoPendente(veiculo, HOJE.minusDays(3), HOJE.minusDays(2));
            fixtures.servicoDaManutencao(vencida, servico, "10.00");

            assertThat(repository.proximasManutencoes(null)).isEmpty();
        }

        @Test
        void ordenaPelaDataDeInicioPrevista() {
            int veiculo = fixtures.veiculo("EEE-1002", "Volvo", "PESADO", 2023, "0.00");
            int servico = fixtures.servicoCatalogo("Alinhamento");
            int tarde = fixtures.manutencaoPendente(veiculo, HOJE.plusDays(20), HOJE.plusDays(21));
            fixtures.servicoDaManutencao(tarde, servico, "10.00");
            int cedo = fixtures.manutencaoPendente(veiculo, HOJE.plusDays(2), HOJE.plusDays(3));
            fixtures.servicoDaManutencao(cedo, servico, "20.00");

            assertThat(repository.proximasManutencoes(null))
                .extracting(ScheduledMaintenanceView::getId)
                .containsExactly(cedo, tarde);
        }

        /** LIMIT 5: a agenda da tela nunca cresce sem limite. */
        @Test
        void limitaACincoRegistros() {
            int veiculo = fixtures.veiculo("EEE-1004", "Volvo", "PESADO", 2023, "0.00");
            int servico = fixtures.servicoCatalogo("Alinhamento");
            for (int dia = 1; dia <= 7; dia++) {
                int m = fixtures.manutencaoPendente(veiculo, HOJE.plusDays(dia), HOJE.plusDays(dia + 1));
                fixtures.servicoDaManutencao(m, servico, "10.00");
            }

            assertThat(repository.proximasManutencoes(null)).hasSize(5);
        }
    }

    @Nested
    @DisplayName("projecaoFinanceiraMesAtual")
    class Projecao {

        /**
         * A consulta usa `DATE_TRUNC('month', CURRENT_DATE)` no SQL, entao o
         * cenario e ancorado no mes corrente. Meio do mes evita que somar ou
         * subtrair dias atravesse a fronteira.
         */
        @Test
        void somaSoManutencoesQueComecamNoMesCorrente() {
            LocalDate meioDoMes = LocalDate.now().withDayOfMonth(15);
            int veiculo = fixtures.veiculo("FFF-1001", "Volvo", "PESADO", 2023, "0.00");
            int servico = fixtures.servicoCatalogo("Troca de Oleo");

            int desteMes = fixtures.manutencaoPendente(veiculo, meioDoMes, meioDoMes.plusDays(1));
            fixtures.servicoDaManutencao(desteMes, servico, "400.00");

            LocalDate proximoMes = meioDoMes.plusMonths(1);
            int doProximo = fixtures.manutencaoPendente(veiculo, proximoMes, proximoMes.plusDays(1));
            fixtures.servicoDaManutencao(doProximo, servico, "900.00");

            LocalDate mesPassado = meioDoMes.minusMonths(1);
            int doPassado = fixtures.manutencaoPendente(veiculo, mesPassado, mesPassado.plusDays(1));
            fixtures.servicoDaManutencao(doPassado, servico, "700.00");

            assertThat(repository.projecaoFinanceiraMesAtual(null)).isEqualByComparingTo("400.00");
        }

        @Test
        void filtraPorTipoDeVeiculo() {
            LocalDate meioDoMes = LocalDate.now().withDayOfMonth(15);
            int servico = fixtures.servicoCatalogo("Troca de Oleo");
            int pesado = fixtures.veiculo("FFF-1002", "Volvo", "PESADO", 2023, "0.00");
            int leve = fixtures.veiculo("FFF-1003", "Fiorino", "LEVE", 2023, "0.00");
            int mPesado = fixtures.manutencaoPendente(pesado, meioDoMes, meioDoMes.plusDays(1));
            fixtures.servicoDaManutencao(mPesado, servico, "400.00");
            int mLeve = fixtures.manutencaoPendente(leve, meioDoMes, meioDoMes.plusDays(1));
            fixtures.servicoDaManutencao(mLeve, servico, "100.00");

            assertThat(repository.projecaoFinanceiraMesAtual("PESADO")).isEqualByComparingTo("400.00");
            assertThat(repository.projecaoFinanceiraMesAtual(null)).isEqualByComparingTo("500.00");
        }

        @Test
        void semManutencaoDevolveZeroENaoNulo() {
            assertThat(repository.projecaoFinanceiraMesAtual(null)).isEqualByComparingTo("0");
        }
    }
}
