package br.com.logap.logitrack.trip;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import br.com.logap.logitrack.shared.BusinessRuleException;
import br.com.logap.logitrack.support.IntegrationTest;
import br.com.logap.logitrack.support.SqlFixtures;
import br.com.logap.logitrack.trip.dto.TripRequest;
import br.com.logap.logitrack.trip.dto.TripStageRequest;

/**
 * Reconciliacao dos trechos da rota (`TripRouteService.synchronizeStages`).
 *
 * O trecho mais sutil do sistema: ha uma constraint `UNIQUE (viagem_id, ordem)`
 * e a rota pode ser reordenada inteira numa unica requisicao. O codigo resolve
 * movendo todas as ordens para valores NEGATIVOS antes de renumerar, liberando
 * as posicoes positivas durante o flush intermediario.
 *
 * Sem esse passo, inverter uma rota estoura a constraint. `inverterRotaCompleta`
 * existe exatamente para falhar se alguem "simplificar" essa parte.
 *
 * Reconciliacao e POR ID, nao por posicao: o trecho mantem identidade quando a
 * rota e reordenada, para o futuro romaneio poder referencia-lo.
 */
class TripStageSynchronizationIT extends IntegrationTest {

    private static final LocalDateTime SAIDA = LocalDateTime.now().plusDays(1).withNano(0);

    @Autowired
    private TripService tripService;

    @Autowired
    private TripStageRepository stageRepository;

    @Autowired
    private SqlFixtures fixtures;

    private int veiculoId;

    @BeforeEach
    void preparar() {
        databaseCleaner.clean();
        veiculoId = fixtures.veiculo("ROT-0001", "Volvo", "PESADO", 2023, "0.00");
    }

    private static TripStageRequest trecho(Integer id, String destino, String km) {
        return new TripStageRequest(id, destino, new BigDecimal(km), new BigDecimal("100.00"), null);
    }

    private TripRequest requisicao(List<TripStageRequest> trechos) {
        return new TripRequest(veiculoId, null, SAIDA, "Sao Paulo", trechos);
    }

    private int criarComTrechos(String... destinos) {
        List<TripStageRequest> trechos = java.util.Arrays.stream(destinos)
            .map(destino -> trecho(null, destino, "10.00"))
            .toList();
        return tripService.create(requisicao(trechos)).id();
    }

    private List<TripStage> trechosDe(int viagemId) {
        return stageRepository.findByViagemIdOrderByOrdemAsc(viagemId);
    }

    @Test
    @DisplayName("criacao numera os trechos a partir de 1, na ordem enviada")
    void criacaoNumeraSequencialmente() {
        int viagem = criarComTrechos("Campinas", "Ribeirao", "Uberlandia");

        assertThat(trechosDe(viagem))
            .extracting(TripStage::getOrdem, TripStage::getCidade)
            .containsExactly(
                tuplaOrdem(1, "Campinas"),
                tuplaOrdem(2, "Ribeirao"),
                tuplaOrdem(3, "Uberlandia"));
    }

    @Test
    @DisplayName("reordenar preserva os IDs dos trechos")
    void reordenarPreservaIdentidade() {
        int viagem = criarComTrechos("Campinas", "Ribeirao", "Uberlandia");
        List<TripStage> originais = trechosDe(viagem);
        Integer idCampinas = originais.get(0).getId();
        Integer idRibeirao = originais.get(1).getId();
        Integer idUberlandia = originais.get(2).getId();

        tripService.update(viagem, requisicao(List.of(
            trecho(idUberlandia, "Uberlandia", "10.00"),
            trecho(idCampinas, "Campinas", "10.00"),
            trecho(idRibeirao, "Ribeirao", "10.00"))));

        assertThat(trechosDe(viagem))
            .extracting(TripStage::getId, TripStage::getCidade)
            .containsExactly(
                tuplaId(idUberlandia, "Uberlandia"),
                tuplaId(idCampinas, "Campinas"),
                tuplaId(idRibeirao, "Ribeirao"));
        assertThat(trechosDe(viagem)).extracting(TripStage::getOrdem)
            .containsExactly((short) 1, (short) 2, (short) 3);
    }

    /**
     * O CASO QUE JUSTIFICA O PASSO DE ORDENS NEGATIVAS.
     *
     * Inverter 5 trechos faz cada um assumir a posicao de outro. Renumerando
     * direto, o primeiro UPDATE ja colide com a linha que ainda ocupa a
     * posicao de destino. Se este teste ficar vermelho com
     * "duplicate key value violates unique constraint", o passo intermediario
     * foi removido.
     */
    @Test
    @DisplayName("inverter a rota inteira nao estoura UNIQUE (viagem_id, ordem)")
    void inverterRotaCompleta() {
        int viagem = criarComTrechos("A", "B", "C", "D", "E");
        List<TripStage> originais = trechosDe(viagem);
        List<TripStageRequest> invertidos = originais.reversed().stream()
            .map(stage -> trecho(stage.getId(), stage.getCidade(), "10.00"))
            .toList();

        tripService.update(viagem, requisicao(invertidos));

        assertThat(trechosDe(viagem)).extracting(TripStage::getCidade)
            .containsExactly("E", "D", "C", "B", "A");
        assertThat(trechosDe(viagem)).extracting(TripStage::getOrdem)
            .containsExactly((short) 1, (short) 2, (short) 3, (short) 4, (short) 5);
    }

    @Test
    @DisplayName("remover o trecho do meio renumera sem buracos")
    void removerTrechoDoMeio() {
        int viagem = criarComTrechos("A", "B", "C");
        List<TripStage> originais = trechosDe(viagem);

        tripService.update(viagem, requisicao(List.of(
            trecho(originais.get(0).getId(), "A", "10.00"),
            trecho(originais.get(2).getId(), "C", "10.00"))));

        assertThat(trechosDe(viagem))
            .extracting(TripStage::getOrdem, TripStage::getCidade)
            .containsExactly(tuplaOrdem(1, "A"), tuplaOrdem(2, "C"));
    }

    @Test
    @DisplayName("trecho novo sem id entra misturado aos existentes")
    void adicionarTrechoNoMeio() {
        int viagem = criarComTrechos("A", "C");
        List<TripStage> originais = trechosDe(viagem);
        Integer idA = originais.get(0).getId();
        Integer idC = originais.get(1).getId();

        tripService.update(viagem, requisicao(List.of(
            trecho(idA, "A", "10.00"),
            trecho(null, "B", "10.00"),
            trecho(idC, "C", "10.00"))));

        List<TripStage> depois = trechosDe(viagem);
        assertThat(depois).extracting(TripStage::getCidade).containsExactly("A", "B", "C");
        assertThat(depois.get(0).getId()).isEqualTo(idA);
        assertThat(depois.get(2).getId()).isEqualTo(idC);
        assertThat(depois.get(1).getId()).isNotIn(idA, idC);
    }

    @Test
    @DisplayName("o mesmo trecho informado duas vezes e recusado")
    void idRepetidoERecusado() {
        int viagem = criarComTrechos("A", "B");
        Integer idA = trechosDe(viagem).get(0).getId();

        assertThatThrownBy(() -> tripService.update(viagem, requisicao(List.of(
            trecho(idA, "A", "10.00"),
            trecho(idA, "A de novo", "10.00")))))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessage("O mesmo trecho foi informado mais de uma vez.");
    }

    @Test
    @DisplayName("trecho de outra viagem e recusado")
    void idDeOutraViagemERecusado() {
        int viagemA = criarComTrechos("A");
        int outroVeiculo = fixtures.veiculo("ROT-0002", "Scania", "PESADO", 2023, "0.00");
        int viagemB = tripService.create(new TripRequest(
            outroVeiculo, null, SAIDA, "Origem B", List.of(trecho(null, "Z", "10.00")))).id();
        Integer idDeB = trechosDe(viagemB).getFirst().getId();

        assertThatThrownBy(() -> tripService.update(viagemA, requisicao(List.of(
            trecho(idDeB, "Z", "10.00")))))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessage("O trecho %d nao pertence a esta viagem.".formatted(idDeB));
    }

    @Test
    @DisplayName("a criacao recusa trecho que ja venha com id")
    void criacaoRecusaIdInformado() {
        assertThatThrownBy(() -> tripService.create(requisicao(List.of(trecho(999, "A", "10.00")))))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessage("Trechos novos nao podem informar id.");
    }

    /** Destino e km totais da viagem sao DERIVADOS dos trechos, nao informados. */
    @Test
    @DisplayName("destino e quilometragem da viagem saem dos trechos")
    void resumoDerivaDosTrechos() {
        int viagem = tripService.create(requisicao(List.of(
            trecho(null, "Campinas", "100.50"),
            trecho(null, "Ribeirao", "220.25")))).id();

        var detalhes = tripService.findById(viagem);

        assertThat(detalhes.destino()).isEqualTo("Ribeirao");
        assertThat(detalhes.kmPercorrida()).isEqualByComparingTo("320.75");
    }

    private static org.assertj.core.groups.Tuple tuplaOrdem(int ordem, String cidade) {
        return org.assertj.core.groups.Tuple.tuple((short) ordem, cidade);
    }

    private static org.assertj.core.groups.Tuple tuplaId(Integer id, String cidade) {
        return org.assertj.core.groups.Tuple.tuple(id, cidade);
    }
}
