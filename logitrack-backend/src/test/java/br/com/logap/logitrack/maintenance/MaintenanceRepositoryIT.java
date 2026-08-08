package br.com.logap.logitrack.maintenance;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;

import br.com.logap.logitrack.support.IntegrationTest;
import br.com.logap.logitrack.support.SqlFixtures;

/**
 * As 2 consultas nativas de `MaintenanceRepository`.
 *
 * A mais delicada e `findFilteredIds`: o filtro "atrasada" REIMPLEMENTA EM SQL
 * a mesma regra que `Maintenance.estaAtrasada` implementa em Java. Duas
 * definicoes da mesma regra podem divergir em silencio — a lista filtraria por
 * um criterio e o badge da tela pintaria por outro.
 *
 * `atrasoEmSqlConcordaComAtrasoEmJava` compara as duas ponta a ponta e e o
 * unico ponto do sistema que impede essa divergencia.
 */
class MaintenanceRepositoryIT extends IntegrationTest {

    private static final LocalDate HOJE = LocalDate.now();

    @Autowired
    private MaintenanceRepository repository;

    @Autowired
    private SqlFixtures fixtures;

    private int veiculoId;
    private int servicoId;

    @BeforeEach
    void preparar() {
        databaseCleaner.clean();
        veiculoId = fixtures.veiculo("MAN-0001", "Volvo", "PESADO", 2023, "0.00");
        servicoId = fixtures.servicoCatalogo("Troca de Oleo");
    }

    private int comServico(int manutencaoId, String custo) {
        fixtures.servicoDaManutencao(manutencaoId, servicoId, custo);
        return manutencaoId;
    }

    private List<Integer> filtrar(String busca, Integer veiculo, String status, Boolean atrasada,
                                  LocalDate de, LocalDate ate, MaintenanceOrder ordem) {
        return repository.findFilteredIds(busca, veiculo, status, atrasada, de, ate,
            (ordem == null ? MaintenanceOrder.DATA_ASC : ordem).name(), PageRequest.of(0, 50)).getContent();
    }

    @Nested
    @DisplayName("findFilteredIds")
    class Filtro {

        @Test
        void semFiltroTrazTodas() {
            int a = comServico(fixtures.manutencaoPendente(veiculoId, HOJE.plusDays(1), HOJE.plusDays(2)), "10.00");
            int b = comServico(fixtures.manutencaoPendente(veiculoId, HOJE.plusDays(3), HOJE.plusDays(4)), "20.00");

            assertThat(filtrar(null, null, null, null, null, null, null))
                .containsExactlyInAnyOrder(a, b);
        }

        @Test
        void filtraPorStatus() {
            int pendente = comServico(fixtures.manutencaoPendente(veiculoId, HOJE.plusDays(1), HOJE.plusDays(2)), "10.00");
            comServico(fixtures.manutencaoEmRealizacao(veiculoId, HOJE, HOJE.plusDays(2)), "20.00");

            assertThat(filtrar(null, null, "PENDENTE", null, null, null, null))
                .containsExactly(pendente);
        }

        /** A busca alcanca placa, modelo E nome do servico da ordem. */
        @Test
        void buscaAlcancaPlacaModeloENomeDoServico() {
            int outroVeiculo = fixtures.veiculo("ZZZ-9999", "Scania R500", "PESADO", 2023, "0.00");
            int servicoFreio = fixtures.servicoCatalogo("Revisao de Freios");
            int daScania = fixtures.manutencaoPendente(outroVeiculo, HOJE.plusDays(1), HOJE.plusDays(2));
            fixtures.servicoDaManutencao(daScania, servicoFreio, "50.00");
            int doVolvo = comServico(fixtures.manutencaoPendente(veiculoId, HOJE.plusDays(1), HOJE.plusDays(2)), "10.00");

            assertThat(filtrar("%scania%", null, null, null, null, null, null)).containsExactly(daScania);
            assertThat(filtrar("%zzz-9999%", null, null, null, null, null, null)).containsExactly(daScania);
            assertThat(filtrar("%freios%", null, null, null, null, null, null)).containsExactly(daScania);
            assertThat(filtrar("%oleo%", null, null, null, null, null, null)).containsExactly(doVolvo);
        }

        @Test
        void filtraPorIntervaloDeInicioPrevisto() {
            comServico(fixtures.manutencaoPendente(veiculoId, HOJE.plusDays(1), HOJE.plusDays(2)), "10.00");
            int dentro = comServico(fixtures.manutencaoPendente(veiculoId, HOJE.plusDays(5), HOJE.plusDays(6)), "20.00");
            comServico(fixtures.manutencaoPendente(veiculoId, HOJE.plusDays(20), HOJE.plusDays(21)), "30.00");

            assertThat(filtrar(null, null, null, null, HOJE.plusDays(4), HOJE.plusDays(6), null))
                .containsExactly(dentro);
        }

        @Test
        void ordenaPorDataEPorCusto() {
            int caraCedo = comServico(
                fixtures.manutencaoPendente(veiculoId, HOJE.plusDays(1), HOJE.plusDays(2)), "900.00");
            int barataTarde = comServico(
                fixtures.manutencaoPendente(veiculoId, HOJE.plusDays(9), HOJE.plusDays(10)), "100.00");

            assertThat(filtrar(null, null, null, null, null, null, MaintenanceOrder.DATA_ASC))
                .containsExactly(caraCedo, barataTarde);
            assertThat(filtrar(null, null, null, null, null, null, MaintenanceOrder.DATA_DESC))
                .containsExactly(barataTarde, caraCedo);
            assertThat(filtrar(null, null, null, null, null, null, MaintenanceOrder.CUSTO_DESC))
                .containsExactly(caraCedo, barataTarde);
            assertThat(filtrar(null, null, null, null, null, null, MaintenanceOrder.CUSTO_ASC))
                .containsExactly(barataTarde, caraCedo);
        }

        /**
         * O TESTE QUE IMPEDE A DIVERGENCIA.
         *
         * O SQL tem o seu proprio CASE de atraso; o Java tem
         * `Maintenance.estaAtrasada`. Aqui os dois julgam o MESMO conjunto e
         * precisam concordar item a item. Se alguem ajustar um limite so de um
         * lado — trocar `<` por `<=`, por exemplo — este teste acusa.
         */
        @Test
        void atrasoEmSqlConcordaComAtrasoEmJava() {
            int pendenteVencida = comServico(
                fixtures.manutencaoPendente(veiculoId, HOJE.minusDays(2), HOJE.plusDays(5)), "10.00");
            int pendenteHoje = comServico(
                fixtures.manutencaoPendente(veiculoId, HOJE, HOJE.plusDays(5)), "10.00");
            int pendenteFutura = comServico(
                fixtures.manutencaoPendente(veiculoId, HOJE.plusDays(3), HOJE.plusDays(5)), "10.00");
            int ativaVencida = comServico(
                fixtures.manutencaoEmRealizacao(veiculoId, HOJE.minusDays(9), HOJE.minusDays(1)), "10.00");
            int ativaNoPrazo = comServico(
                fixtures.manutencaoEmRealizacao(
                    fixtures.veiculo("MAN-0002", "Scania", "PESADO", 2023, "0.00"),
                    HOJE.minusDays(1), HOJE.plusDays(3)), "10.00");
            int concluidaAntiga = comServico(
                fixtures.manutencaoConcluida(veiculoId, HOJE.minusDays(30), HOJE.minusDays(29)), "10.00");

            List<Integer> atrasadasNoSql = filtrar(null, null, null, true, null, null, null);
            List<Integer> noPrazoNoSql = filtrar(null, null, null, false, null, null, null);

            List<Integer> atrasadasNoJava = repository.findAllWithDetailsByIdIn(
                    List.of(pendenteVencida, pendenteHoje, pendenteFutura,
                        ativaVencida, ativaNoPrazo, concluidaAntiga)).stream()
                .filter(m -> m.estaAtrasada(HOJE))
                .map(Maintenance::getId)
                .toList();

            assertThat(atrasadasNoSql)
                .containsExactlyInAnyOrderElementsOf(atrasadasNoJava)
                .containsExactlyInAnyOrder(pendenteVencida, ativaVencida);
            assertThat(noPrazoNoSql)
                .containsExactlyInAnyOrder(pendenteHoje, pendenteFutura, ativaNoPrazo, concluidaAntiga);
        }
    }

    /**
     * A agenda ordena por prioridade em tres faixas — vencidas, vencendo hoje,
     * futuras — e so depois por data. E a ordem da tela de Manutencoes.
     */
    @Nested
    @DisplayName("findAgendaIds")
    class Agenda {

        @Test
        void vencidasVemPrimeiroDepoisAsDeHojeDepoisAsFuturas() {
            int futura = comServico(
                fixtures.manutencaoPendente(veiculoId, HOJE.plusDays(10), HOJE.plusDays(11)), "10.00");
            int deHoje = comServico(
                fixtures.manutencaoPendente(
                    fixtures.veiculo("AGD-0002", "A", "LEVE", 2023, "0.00"), HOJE, HOJE.plusDays(1)), "10.00");
            int vencida = comServico(
                fixtures.manutencaoPendente(
                    fixtures.veiculo("AGD-0003", "B", "LEVE", 2023, "0.00"),
                    HOJE.minusDays(4), HOJE.plusDays(1)), "10.00");

            assertThat(repository.findAgendaIds(PageRequest.of(0, 10)))
                .containsExactly(vencida, deHoje, futura);
        }

        @Test
        void dentroDaMesmaFaixaOrdenaPelaDataPrevista() {
            int tarde = comServico(
                fixtures.manutencaoPendente(veiculoId, HOJE.plusDays(20), HOJE.plusDays(21)), "10.00");
            int cedo = comServico(
                fixtures.manutencaoPendente(
                    fixtures.veiculo("AGD-0004", "C", "LEVE", 2023, "0.00"),
                    HOJE.plusDays(2), HOJE.plusDays(3)), "10.00");

            assertThat(repository.findAgendaIds(PageRequest.of(0, 10)))
                .containsExactly(cedo, tarde);
        }

        @Test
        void respeitaOTamanhoDaPagina() {
            for (int dia = 1; dia <= 6; dia++) {
                comServico(fixtures.manutencaoPendente(
                    fixtures.veiculo("AGD-1%03d".formatted(dia), "X", "LEVE", 2023, "0.00"),
                    HOJE.plusDays(dia), HOJE.plusDays(dia + 1)), "10.00");
            }

            assertThat(repository.findAgendaIds(PageRequest.of(0, 5))).hasSize(5);
        }
    }
}
