package br.com.logap.logitrack.trip;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
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
import br.com.logap.logitrack.vehicle.VehicleRepository;
import br.com.logap.logitrack.vehicle.projection.FleetVehicleView;

/**
 * O QUE JA ACONTECEU NAO SE APAGA NEM ENCOLHE.
 *
 * Viagem e trecho concluidos sao fato consumado: a quilometragem deles ja
 * compoe o hodometro do veiculo (`km_inicial` mais a soma das viagens
 * concluidas). Excluir o registro ou reduzir o km faria o hodometro ANDAR PARA
 * TRAS — o sistema passaria a afirmar que o veiculo rodou menos do que rodou.
 *
 * Cada teste aqui fecha um caminho que levava a isso.
 */
class CompletedHistoryIsImmutableIT extends IntegrationTest {

    private static final LocalDateTime SAIDA = LocalDateTime.now().plusDays(1).withNano(0);

    @Autowired
    private TripService tripService;

    @Autowired
    private TripStageRepository stageRepository;

    @Autowired
    private VehicleRepository vehicleRepository;

    @Autowired
    private SqlFixtures fixtures;

    private int veiculoId;
    private int motoristaId;

    @BeforeEach
    void preparar() {
        databaseCleaner.clean();
        veiculoId = fixtures.veiculo("IMU-0001", "Volvo FH", "PESADO", 2023, "1000.00");
        motoristaId = fixtures.motorista("Ana", "20000000001");
    }

    private int viagem(String... destinos) {
        List<TripStageRequest> trechos = java.util.Arrays.stream(destinos)
            .map(destino -> new TripStageRequest(
                null, destino, new BigDecimal("600.00"), new BigDecimal("1000.00"), null))
            .toList();
        return tripService.create(
            new TripRequest(veiculoId, motoristaId, SAIDA, "Natal-RN", trechos)).id();
    }

    private List<TripStage> trechos(int viagemId) {
        return stageRepository.findByViagemIdOrderByOrdemAsc(viagemId);
    }

    private TripStageRequest pedidoDoTrecho(TripStage trecho, String km) {
        return new TripStageRequest(
            trecho.getId(), trecho.getCidade(), new BigDecimal(km), trecho.getCargaKg(), null);
    }

    private BigDecimal hodometro() {
        return vehicleRepository.findFleetPage(null, null, null, PageRequest.of(0, 10))
            .getContent().stream()
            .filter(v -> v.getPlaca().equals("IMU-0001"))
            .findFirst().map(FleetVehicleView::getOdometroKm).orElseThrow();
    }

    @Nested
    @DisplayName("viagem concluida")
    class ViagemConcluida {

        @Test
        void naoPodeSerExcluida() {
            int viagemId = viagem("Recife");
            tripService.start(viagemId);
            tripService.finish(viagemId);

            assertThatThrownBy(() -> tripService.delete(viagemId))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Viagens concluidas nao podem ser excluidas: %d.".formatted(viagemId));
        }

        /** O hodometro e a razao da regra: precisa continuar de pe depois da tentativa. */
        @Test
        void oHodometroNaoRetrocedeAposTentativaDeExclusao() {
            int viagemId = viagem("Recife");
            tripService.start(viagemId);
            tripService.finish(viagemId);
            assertThat(hodometro()).isEqualByComparingTo("1600.00");

            assertThatThrownBy(() -> tripService.delete(viagemId))
                .isInstanceOf(BusinessRuleException.class);

            assertThat(hodometro()).isEqualByComparingTo("1600.00");
        }

        @Test
        void aExclusaoEmLoteApontaTodasAsConcluidas() {
            int a = viagem("Recife");
            tripService.start(a);
            tripService.finish(a);
            int outroVeiculo = fixtures.veiculo("IMU-0002", "Scania", "PESADO", 2023, "0.00");
            int outroMotorista = fixtures.motorista("Bruno", "20000000002");
            int b = tripService.create(new TripRequest(outroVeiculo, outroMotorista, SAIDA, "Santos",
                List.of(new TripStageRequest(
                    null, "Sao Paulo", new BigDecimal("80.00"), new BigDecimal("500.00"), null)))).id();
            tripService.start(b);
            tripService.finish(b);

            assertThatThrownBy(() -> tripService.deleteAll(List.of(a, b)))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining(String.valueOf(a))
                .hasMessageContaining(String.valueOf(b));
        }

        /** Cancelar continua sendo o caminho: preserva o registro e nao soma no hodometro. */
        @Test
        void viagemCanceladaSegueExcluivel() {
            int viagemId = viagem("Recife");
            tripService.cancel(viagemId);

            assertThatCode(() -> tripService.delete(viagemId)).doesNotThrowAnyException();
        }

        @Test
        void viagemProgramadaSegueExcluivel() {
            int viagemId = viagem("Recife");

            assertThatCode(() -> tripService.delete(viagemId)).doesNotThrowAnyException();
        }
    }

    @Nested
    @DisplayName("trecho concluido")
    class TrechoConcluido {

        @Test
        void naoPodeSerRemovidoDaRota() {
            int viagemId = viagem("Recife", "Rio de Janeiro");
            tripService.start(viagemId);
            List<TripStage> rota = trechos(viagemId);
            tripService.completeStage(viagemId, rota.get(0).getId());

            // Reenvia a rota SEM o trecho ja concluido.
            assertThatThrownBy(() -> tripService.update(viagemId, new TripRequest(
                veiculoId, motoristaId, SAIDA, "Natal-RN",
                List.of(pedidoDoTrecho(rota.get(1), "600.00")))))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("O trecho %d ja foi concluido e nao pode ser removido."
                    .formatted(rota.get(0).getId()));
        }

        /** O caso que o usuario levantou: reduzir a quilometragem ja percorrida. */
        @Test
        void naoPodeTerAQuilometragemReduzida() {
            int viagemId = viagem("Recife", "Rio de Janeiro");
            tripService.start(viagemId);
            List<TripStage> rota = trechos(viagemId);
            tripService.completeStage(viagemId, rota.get(0).getId());

            assertThatThrownBy(() -> tripService.update(viagemId, new TripRequest(
                veiculoId, motoristaId, SAIDA, "Natal-RN",
                List.of(pedidoDoTrecho(rota.get(0), "1.00"), pedidoDoTrecho(rota.get(1), "600.00")))))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("O trecho %d ja foi concluido e nao pode ser alterado."
                    .formatted(rota.get(0).getId()));
        }

        /** Aumentar tambem nao: o trecho aconteceu com a distancia que tinha. */
        @Test
        void naoPodeTerAQuilometragemAumentada() {
            int viagemId = viagem("Recife", "Rio de Janeiro");
            tripService.start(viagemId);
            List<TripStage> rota = trechos(viagemId);
            tripService.completeStage(viagemId, rota.get(0).getId());

            assertThatThrownBy(() -> tripService.update(viagemId, new TripRequest(
                veiculoId, motoristaId, SAIDA, "Natal-RN",
                List.of(pedidoDoTrecho(rota.get(0), "9999.00"), pedidoDoTrecho(rota.get(1), "600.00")))))
                .isInstanceOf(BusinessRuleException.class);
        }

        /** Reenviar o trecho concluido IGUAL nao e alteracao — a rota pode ser editada. */
        @Test
        void reenviarOMesmoTrechoConcluidoNaoBloqueiaAEdicaoDaRota() {
            int viagemId = viagem("Recife", "Rio de Janeiro");
            tripService.start(viagemId);
            List<TripStage> rota = trechos(viagemId);
            tripService.completeStage(viagemId, rota.get(0).getId());

            // Trecho 1 intacto; trecho 2 (pendente) muda de quilometragem.
            assertThatCode(() -> tripService.update(viagemId, new TripRequest(
                veiculoId, motoristaId, SAIDA, "Natal-RN",
                List.of(pedidoDoTrecho(rota.get(0), "600.00"), pedidoDoTrecho(rota.get(1), "750.00")))))
                .doesNotThrowAnyException();

            assertThat(trechos(viagemId)).extracting(t -> t.getKmTrecho().intValue())
                .containsExactly(600, 750);
        }

        @Test
        void trechoPendenteSegueRemovivel() {
            int viagemId = viagem("Recife", "Rio de Janeiro");
            tripService.start(viagemId);
            List<TripStage> rota = trechos(viagemId);
            tripService.completeStage(viagemId, rota.get(0).getId());

            assertThatCode(() -> tripService.update(viagemId, new TripRequest(
                veiculoId, motoristaId, SAIDA, "Natal-RN",
                List.of(pedidoDoTrecho(rota.get(0), "600.00")))))
                .doesNotThrowAnyException();

            assertThat(trechos(viagemId)).hasSize(1);
        }
    }
}
