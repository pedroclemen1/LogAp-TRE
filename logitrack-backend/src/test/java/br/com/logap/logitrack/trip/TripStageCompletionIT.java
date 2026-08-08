package br.com.logap.logitrack.trip;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;

import br.com.logap.logitrack.shared.BusinessRuleException;
import br.com.logap.logitrack.support.IntegrationTest;
import br.com.logap.logitrack.support.SqlFixtures;
import br.com.logap.logitrack.trip.dto.TripRequest;
import br.com.logap.logitrack.trip.dto.TripStageRequest;

/**
 * Conclusao da rota trecho a trecho.
 *
 * A viagem so podia ser encerrada de uma vez, e apenas o ultimo trecho recebia
 * `realizado_em`. O romaneio precisa de hora de chegada POR PONTO da rota,
 * gravada quando aconteceu — nao inferida no fim.
 *
 * As regras que estes testes travam:
 *   - so avanca com a viagem EM_ANDAMENTO;
 *   - so o proximo trecho pendente pode ser concluido (ordem obrigatoria);
 *   - concluir o ultimo trecho encerra a viagem;
 *   - "concluir viagem" continua funcionando como atalho e fecha os pendentes,
 *     preservando o horario dos que ja tinham sido concluidos um a um.
 */
class TripStageCompletionIT extends IntegrationTest {

    private static final LocalDateTime SAIDA = LocalDateTime.now().plusDays(1).withNano(0);

    @Autowired
    private TripService tripService;

    @Autowired
    private TripStageRepository stageRepository;

    @Autowired
    private SqlFixtures fixtures;

    private int veiculoId;
    private int motoristaId;

    @BeforeEach
    void preparar() {
        databaseCleaner.clean();
        veiculoId = fixtures.veiculo("STG-0001", "Volvo", "PESADO", 2023, "0.00");
        motoristaId = fixtures.motorista("Ana", "10000000001");
    }

    /** Cria uma viagem com os destinos informados e ja a coloca em andamento. */
    private int viagemEmAndamento(String... destinos) {
        List<TripStageRequest> trechos = java.util.Arrays.stream(destinos)
            .map(destino -> new TripStageRequest(
                null, destino, new BigDecimal("100.00"), new BigDecimal("500.00"), null))
            .toList();
        int id = tripService.create(
            new TripRequest(veiculoId, motoristaId, SAIDA, "Natal-RN", trechos)).id();
        tripService.start(id);
        return id;
    }

    private List<TripStage> trechos(int viagemId) {
        return stageRepository.findByViagemIdOrderByOrdemAsc(viagemId);
    }

    @Nested
    @DisplayName("avanco trecho a trecho")
    class Avanco {

        @Test
        void concluirOPrimeiroTrechoNaoEncerraAViagem() {
            int viagem = viagemEmAndamento("Recife", "Rio de Janeiro", "Niteroi");
            List<TripStage> rota = trechos(viagem);

            var resposta = tripService.completeStage(viagem, rota.get(0).getId());

            assertThat(resposta.status()).isEqualTo(TripStatus.EM_ANDAMENTO);
            assertThat(trechos(viagem).get(0).getRealizadoEm()).isNotNull();
            assertThat(trechos(viagem).get(1).getRealizadoEm()).isNull();
            assertThat(trechos(viagem).get(2).getRealizadoEm()).isNull();
        }

        @Test
        void avancaAteOPenultimoSemEncerrar() {
            int viagem = viagemEmAndamento("Recife", "Rio de Janeiro", "Niteroi");
            List<TripStage> rota = trechos(viagem);

            tripService.completeStage(viagem, rota.get(0).getId());
            var resposta = tripService.completeStage(viagem, rota.get(1).getId());

            assertThat(resposta.status()).isEqualTo(TripStatus.EM_ANDAMENTO);
            assertThat(trechos(viagem)).extracting(stage -> stage.getRealizadoEm() != null)
                .containsExactly(true, true, false);
        }

        /** Chegar ao destino final E ter chegado: a viagem fecha sozinha. */
        @Test
        void concluirOUltimoTrechoEncerraAViagem() {
            int viagem = viagemEmAndamento("Recife", "Niteroi");
            List<TripStage> rota = trechos(viagem);

            tripService.completeStage(viagem, rota.get(0).getId());
            var resposta = tripService.completeStage(viagem, rota.get(1).getId());

            assertThat(resposta.status()).isEqualTo(TripStatus.CONCLUIDA);
            assertThat(resposta.dataChegada()).isNotNull();
            assertThat(trechos(viagem)).allMatch(TripStage::concluido);
        }

        @Test
        void rotaDeUmTrechoSoEncerraNaPrimeiraConclusao() {
            int viagem = viagemEmAndamento("Recife");

            var resposta = tripService.completeStage(viagem, trechos(viagem).getFirst().getId());

            assertThat(resposta.status()).isEqualTo(TripStatus.CONCLUIDA);
        }

        @Test
        void cadaConclusaoRegistraUmEventoNoHistorico() {
            int viagem = viagemEmAndamento("Recife", "Niteroi");
            List<TripStage> rota = trechos(viagem);

            tripService.completeStage(viagem, rota.get(0).getId());

            assertThat(tripService.findDetails(viagem).eventos())
                .anySatisfy(evento -> {
                    assertThat(evento.tipo()).isEqualTo(TripEventType.TRECHO_CONCLUIDO);
                    assertThat(evento.detalhe()).contains("Recife").contains("leg 1 of 2");
                });
        }
    }

    @Nested
    @DisplayName("regras de bloqueio")
    class Bloqueios {

        /** Nao se chega em Niteroi sem ter passado por Recife. */
        @Test
        void pularTrechoERecusado() {
            int viagem = viagemEmAndamento("Recife", "Rio de Janeiro", "Niteroi");
            List<TripStage> rota = trechos(viagem);

            assertThatThrownBy(() -> tripService.completeStage(viagem, rota.get(2).getId()))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Conclua os trechos na ordem da rota.");
        }

        @Test
        void concluirDuasVezesORecusa() {
            int viagem = viagemEmAndamento("Recife", "Niteroi");
            int primeiro = trechos(viagem).getFirst().getId();
            tripService.completeStage(viagem, primeiro);

            assertThatThrownBy(() -> tripService.completeStage(viagem, primeiro))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Este trecho ja foi concluido.");
        }

        @Test
        void viagemProgramadaNaoAvancaTrecho() {
            List<TripStageRequest> trechosPedido = List.of(new TripStageRequest(
                null, "Recife", new BigDecimal("100.00"), new BigDecimal("500.00"), null));
            int viagem = tripService.create(
                new TripRequest(veiculoId, motoristaId, SAIDA, "Natal-RN", trechosPedido)).id();

            assertThatThrownBy(() -> tripService.completeStage(viagem, trechos(viagem).getFirst().getId()))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Inicie a viagem antes de concluir um trecho.");
        }

        @Test
        void viagemConcluidaNaoAvancaTrecho() {
            int viagem = viagemEmAndamento("Recife");
            tripService.finish(viagem);

            assertThatThrownBy(() -> tripService.completeStage(viagem, trechos(viagem).getFirst().getId()))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Inicie a viagem antes de concluir um trecho.");
        }

        @Test
        void trechoDeOutraViagemERecusado() {
            int viagemA = viagemEmAndamento("Recife");
            int outroVeiculo = fixtures.veiculo("STG-0002", "Scania", "PESADO", 2023, "0.00");
            int outroMotorista = fixtures.motorista("Bruno", "10000000002");
            int viagemB = tripService.create(new TripRequest(
                outroVeiculo, outroMotorista, SAIDA, "Origem B",
                List.of(new TripStageRequest(
                    null, "Z", new BigDecimal("10.00"), new BigDecimal("10.00"), null)))).id();
            int trechoDeB = trechos(viagemB).getFirst().getId();

            assertThatThrownBy(() -> tripService.completeStage(viagemA, trechoDeB))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("O trecho %d nao pertence a esta viagem.".formatted(trechoDeB));
        }
    }

    @Nested
    @DisplayName("concluir viagem como atalho")
    class ConcluirTudo {

        /**
         * O bug que motivou a mudanca: antes, encerrar a viagem carimbava so o
         * ULTIMO trecho e deixava os intermediarios sem `realizado_em` — uma
         * viagem CONCLUIDA com paradas em aberto, inutil para o romaneio.
         */
        @Test
        void encerrarAViagemFechaTodosOsTrechosPendentes() {
            int viagem = viagemEmAndamento("Recife", "Rio de Janeiro", "Niteroi");

            tripService.finish(viagem);

            assertThat(trechos(viagem)).allMatch(TripStage::concluido);
        }

        /** Quem ja foi concluido um a um preserva o horario real, nao o do fecho. */
        @Test
        void horarioDeTrechoJaConcluidoEPreservado() {
            int viagem = viagemEmAndamento("Recife", "Rio de Janeiro", "Niteroi");
            List<TripStage> rota = trechos(viagem);
            tripService.completeStage(viagem, rota.get(0).getId());
            LocalDateTime chegadaDoPrimeiro = trechos(viagem).get(0).getRealizadoEm();

            tripService.finish(viagem);

            List<TripStage> depois = trechos(viagem);
            assertThat(depois.get(0).getRealizadoEm()).isEqualTo(chegadaDoPrimeiro);
            assertThat(depois.get(1).getRealizadoEm()).isNotNull();
            assertThat(depois.get(2).getRealizadoEm()).isNotNull();
        }
    }

    @Nested
    @DisplayName("rota completa na listagem")
    class RotaNaListagem {

        /**
         * A tabela mostrava so "origem -> destino" e escondia as paradas. Agora
         * a listagem traz a rota inteira, em UMA consulta para a pagina toda.
         */
        @Test
        void listagemTrazAsParadasNaOrdem() {
            viagemEmAndamento("Recife", "Rio de Janeiro", "Niteroi");

            var pagina = tripService.list(null, null, null, PageRequest.of(0, 10));

            assertThat(pagina.getContent()).singleElement().satisfies(viagem -> {
                assertThat(viagem.origem()).isEqualTo("Natal-RN");
                assertThat(viagem.rota()).containsExactly("Recife", "Rio de Janeiro", "Niteroi");
                assertThat(viagem.destino()).isEqualTo("Niteroi");
            });
        }

        @Test
        void cadaViagemRecebeApenasAPropriaRota() {
            viagemEmAndamento("Recife", "Niteroi");
            int outroVeiculo = fixtures.veiculo("STG-0003", "Scania", "PESADO", 2023, "0.00");
            tripService.create(new TripRequest(outroVeiculo, null, SAIDA, "Curitiba",
                List.of(new TripStageRequest(
                    null, "Joinville", new BigDecimal("10.00"), new BigDecimal("10.00"), null))));

            var pagina = tripService.list(null, null, null, PageRequest.of(0, 10));

            assertThat(pagina.getContent())
                .filteredOn(viagem -> viagem.origem().equals("Curitiba"))
                .singleElement()
                .satisfies(viagem -> assertThat(viagem.rota()).containsExactly("Joinville"));
        }
    }
}
