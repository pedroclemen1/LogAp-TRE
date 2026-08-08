package br.com.logap.logitrack.trip;

import static br.com.logap.logitrack.support.DomainFixtures.CHEGADA_PREVISTA;
import static br.com.logap.logitrack.support.DomainFixtures.PARTIDA;
import static br.com.logap.logitrack.support.DomainFixtures.motoristaInativo;
import static br.com.logap.logitrack.support.DomainFixtures.veiculo;
import static br.com.logap.logitrack.support.DomainFixtures.viagemCancelada;
import static br.com.logap.logitrack.support.DomainFixtures.viagemConcluida;
import static br.com.logap.logitrack.support.DomainFixtures.viagemEmAndamento;
import static br.com.logap.logitrack.support.DomainFixtures.viagemProgramada;
import static br.com.logap.logitrack.support.DomainFixtures.viagemSemMotorista;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import br.com.logap.logitrack.shared.BusinessRuleException;

/**
 * Maquina de estados da viagem, sem Spring e sem banco.
 *
 * AS MENSAGENS SAO ASSERIDAS LITERALMENTE DE PROPOSITO. O frontend traduz erro
 * da API casando o texto exato (`shared/api/api-error-localization.ts`, 82
 * strings). Mudar uma mensagem aqui quebra a i18n do front em silencio — estes
 * testes transformam essa quebra silenciosa em build vermelho.
 */
class TripStateMachineTest {

    @Nested
    @DisplayName("iniciar")
    class Iniciar {

        @Test
        void programadaComMotoristaAtivoInicia() {
            Trip trip = viagemProgramada();

            trip.iniciar(PARTIDA);

            assertThat(trip.getStatus()).isEqualTo(TripStatus.EM_ANDAMENTO);
            assertThat(trip.getIniciadaEm()).isEqualTo(PARTIDA);
        }

        @Test
        void concluidaNaoInicia() {
            assertThatThrownBy(() -> viagemConcluida().iniciar(PARTIDA))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Uma viagem concluida nao pode ser iniciada.");
        }

        @Test
        void jaEmAndamentoNaoInicia() {
            assertThatThrownBy(() -> viagemEmAndamento().iniciar(PARTIDA))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("A viagem ja esta em andamento.");
        }

        @Test
        void canceladaNaoInicia() {
            assertThatThrownBy(() -> viagemCancelada().iniciar(PARTIDA))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Uma viagem cancelada nao pode ser alterada.");
        }

        @Test
        void semMotoristaNaoInicia() {
            assertThatThrownBy(() -> viagemSemMotorista().iniciar(PARTIDA))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Atribua um motorista antes de iniciar a viagem.");
        }

        @Test
        void motoristaInativoNaoInicia() {
            Trip trip = new Trip(veiculo(), motoristaInativo(), PARTIDA, CHEGADA_PREVISTA,
                "Sao Paulo", "Rio de Janeiro", new BigDecimal("435.00"), new BigDecimal("800.00"));

            assertThatThrownBy(() -> trip.iniciar(PARTIDA))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("O motorista atribuido esta inativo.");
        }

        /**
         * Cancelamento vence estado: uma viagem cancelada E sem motorista
         * reporta o cancelamento, nao a falta de condutor. A ordem das guardas
         * e contrato com a tela, nao detalhe de implementacao.
         */
        @Test
        void cancelamentoTemPrecedenciaSobreFaltaDeMotorista() {
            Trip trip = viagemSemMotorista();
            trip.cancelar(PARTIDA);

            assertThatThrownBy(() -> trip.iniciar(PARTIDA))
                .hasMessage("Uma viagem cancelada nao pode ser alterada.");
        }
    }

    @Nested
    @DisplayName("concluir")
    class Concluir {

        @Test
        void emAndamentoConclui() {
            Trip trip = viagemEmAndamento();

            trip.concluir(CHEGADA_PREVISTA);

            assertThat(trip.getStatus()).isEqualTo(TripStatus.CONCLUIDA);
            assertThat(trip.getDataChegada()).isEqualTo(CHEGADA_PREVISTA);
        }

        @Test
        void jaConcluidaNaoConclui() {
            assertThatThrownBy(() -> viagemConcluida().concluir(CHEGADA_PREVISTA))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("A viagem ja esta concluida.");
        }

        @Test
        void programadaNaoConclui() {
            assertThatThrownBy(() -> viagemProgramada().concluir(CHEGADA_PREVISTA))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Inicie a viagem antes de conclui-la.");
        }

        @Test
        void canceladaNaoConclui() {
            assertThatThrownBy(() -> viagemCancelada().concluir(CHEGADA_PREVISTA))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Uma viagem cancelada nao pode ser alterada.");
        }
    }

    @Nested
    @DisplayName("cancelar")
    class Cancelar {

        @Test
        void programadaCancela() {
            Trip trip = viagemProgramada();

            trip.cancelar(PARTIDA);

            assertThat(trip.getStatus()).isEqualTo(TripStatus.CANCELADA);
        }

        @Test
        void emAndamentoCancela() {
            Trip trip = viagemEmAndamento();

            trip.cancelar(CHEGADA_PREVISTA);

            assertThat(trip.getStatus()).isEqualTo(TripStatus.CANCELADA);
        }

        @Test
        void jaCanceladaNaoCancela() {
            assertThatThrownBy(() -> viagemCancelada().cancelar(PARTIDA))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("A viagem ja esta cancelada.");
        }

        @Test
        void concluidaNaoCancela() {
            assertThatThrownBy(() -> viagemConcluida().cancelar(CHEGADA_PREVISTA))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Uma viagem concluida nao pode ser cancelada.");
        }
    }

    @Nested
    @DisplayName("atualizar")
    class Atualizar {

        @Test
        void programadaAtualiza() {
            Trip trip = viagemProgramada();

            assertThatCode(() -> trip.atualizar(veiculo(), trip.getMotorista(), PARTIDA, CHEGADA_PREVISTA,
                "Campinas", "Santos", new BigDecimal("150.00"), new BigDecimal("500.00")))
                .doesNotThrowAnyException();
            assertThat(trip.getOrigem()).isEqualTo("Campinas");
        }

        @Test
        void concluidaNaoAtualiza() {
            Trip trip = viagemConcluida();

            assertThatThrownBy(() -> trip.atualizar(veiculo(), trip.getMotorista(), PARTIDA, CHEGADA_PREVISTA,
                "Campinas", "Santos", new BigDecimal("150.00"), new BigDecimal("500.00")))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Uma viagem concluida nao pode ser alterada.");
        }

        @Test
        void canceladaNaoAtualiza() {
            Trip trip = viagemCancelada();

            assertThatThrownBy(() -> trip.atualizar(veiculo(), trip.getMotorista(), PARTIDA, CHEGADA_PREVISTA,
                "Campinas", "Santos", new BigDecimal("150.00"), new BigDecimal("500.00")))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Uma viagem cancelada nao pode ser alterada.");
        }

        /** Estado invalido nao pode mutar nada antes de falhar. */
        @Test
        void falhaNaoAlteraEstado() {
            Trip trip = viagemConcluida();

            assertThatThrownBy(() -> trip.atualizar(veiculo(), trip.getMotorista(), PARTIDA, CHEGADA_PREVISTA,
                "Campinas", "Santos", new BigDecimal("150.00"), new BigDecimal("500.00")))
                .isInstanceOf(BusinessRuleException.class);
            assertThat(trip.getOrigem()).isEqualTo("Sao Paulo");
            assertThat(trip.getDestino()).isEqualTo("Rio de Janeiro");
        }
    }
}
