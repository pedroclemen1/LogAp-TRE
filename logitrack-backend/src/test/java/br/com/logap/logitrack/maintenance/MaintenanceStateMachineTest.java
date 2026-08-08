package br.com.logap.logitrack.maintenance;

import static br.com.logap.logitrack.support.DomainFixtures.manutencaoConcluida;
import static br.com.logap.logitrack.support.DomainFixtures.manutencaoEmRealizacao;
import static br.com.logap.logitrack.support.DomainFixtures.manutencaoPendente;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import br.com.logap.logitrack.shared.BusinessRuleException;

/**
 * Maquina de estados da manutencao e a regra de atraso, sem Spring e sem banco.
 *
 * A regra de atraso so pode ser testada assim porque saiu de
 * `MaintenanceResponse` (que chamava `LocalDate.now()`) e virou
 * `Maintenance.estaAtrasada(hoje)`. Antes disso, exigiria mexer no relogio da
 * JVM. Mensagens asseridas literalmente pelo mesmo motivo do teste de viagem.
 */
class MaintenanceStateMachineTest {

    private static final LocalDate INICIO = LocalDate.of(2026, 3, 10);
    private static final LocalDate FIM = LocalDate.of(2026, 3, 12);

    @Nested
    @DisplayName("transicoes")
    class Transicoes {

        @Test
        void pendenteInicia() {
            Maintenance maintenance = manutencaoPendente(INICIO, FIM);

            maintenance.iniciar(INICIO.atStartOfDay());

            assertThat(maintenance.getStatus()).isEqualTo(MaintenanceStatus.EM_REALIZACAO);
            assertThat(maintenance.getIniciadaEm()).isEqualTo(INICIO.atStartOfDay());
        }

        @Test
        void emRealizacaoNaoInicia() {
            assertThatThrownBy(() -> manutencaoEmRealizacao(INICIO, FIM).iniciar(INICIO.atStartOfDay()))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Somente uma manutencao pendente pode ser iniciada.");
        }

        @Test
        void concluidaNaoInicia() {
            assertThatThrownBy(() -> manutencaoConcluida(INICIO, FIM).iniciar(INICIO.atStartOfDay()))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Somente uma manutencao pendente pode ser iniciada.");
        }

        @Test
        void emRealizacaoConclui() {
            Maintenance maintenance = manutencaoEmRealizacao(INICIO, FIM);

            maintenance.concluir(FIM.atStartOfDay());

            assertThat(maintenance.getStatus()).isEqualTo(MaintenanceStatus.CONCLUIDA);
            assertThat(maintenance.getConcluidaEm()).isEqualTo(FIM.atStartOfDay());
        }

        @Test
        void pendenteNaoConclui() {
            assertThatThrownBy(() -> manutencaoPendente(INICIO, FIM).concluir(FIM.atStartOfDay()))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Somente uma manutencao em realizacao pode ser concluida.");
        }

        @Test
        void concluidaNaoConclui() {
            assertThatThrownBy(() -> manutencaoConcluida(INICIO, FIM).concluir(FIM.atStartOfDay()))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Somente uma manutencao em realizacao pode ser concluida.");
        }
    }

    @Nested
    @DisplayName("guardas de alteracao e exclusao")
    class Guardas {

        @Test
        void pendenteAlteraEExclui() {
            Maintenance maintenance = manutencaoPendente(INICIO, FIM);

            assertThatCode(maintenance::validarPodeAlterar).doesNotThrowAnyException();
            assertThatCode(maintenance::validarPodeExcluir).doesNotThrowAnyException();
        }

        @Test
        void concluidaNaoAltera() {
            assertThatThrownBy(() -> manutencaoConcluida(INICIO, FIM).validarPodeAlterar())
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Uma manutencao concluida nao pode ser alterada.");
        }

        /** Em realizacao PODE ser alterada (so a finalizacao prevista); quem restringe o resto e o servico. */
        @Test
        void emRealizacaoAlteraMasNaoExclui() {
            Maintenance maintenance = manutencaoEmRealizacao(INICIO, FIM);

            assertThatCode(maintenance::validarPodeAlterar).doesNotThrowAnyException();
            assertThatThrownBy(maintenance::validarPodeExcluir)
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Somente uma manutencao pendente pode ser excluida.");
        }

        @Test
        void concluidaNaoExclui() {
            assertThatThrownBy(() -> manutencaoConcluida(INICIO, FIM).validarPodeExcluir())
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Somente uma manutencao pendente pode ser excluida.");
        }
    }

    /**
     * Regra: pendente vence no inicio previsto, em realizacao vence na
     * finalizacao prevista, concluida nunca atrasa. O limite e `isBefore`, entao
     * o proprio dia previsto ainda NAO esta atrasado.
     */
    @Nested
    @DisplayName("estaAtrasada")
    class Atraso {

        @Test
        void pendenteAtrasaDepoisDoInicioPrevisto() {
            Maintenance maintenance = manutencaoPendente(INICIO, FIM);

            assertThat(maintenance.estaAtrasada(INICIO.minusDays(1))).isFalse();
            assertThat(maintenance.estaAtrasada(INICIO)).isFalse();
            assertThat(maintenance.estaAtrasada(INICIO.plusDays(1))).isTrue();
        }

        @Test
        void emRealizacaoAtrasaDepoisDaFinalizacaoPrevista() {
            Maintenance maintenance = manutencaoEmRealizacao(INICIO, FIM);

            // Passou do inicio previsto mas ainda esta dentro do prazo final.
            assertThat(maintenance.estaAtrasada(INICIO.plusDays(1))).isFalse();
            assertThat(maintenance.estaAtrasada(FIM)).isFalse();
            assertThat(maintenance.estaAtrasada(FIM.plusDays(1))).isTrue();
        }

        @Test
        void concluidaNuncaAtrasa() {
            Maintenance maintenance = manutencaoConcluida(INICIO, FIM);

            assertThat(maintenance.estaAtrasada(FIM.plusYears(1))).isFalse();
        }
    }
}
