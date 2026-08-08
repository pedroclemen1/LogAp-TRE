package br.com.logap.logitrack.trip;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import br.com.logap.logitrack.maintenance.MaintenanceService;
import br.com.logap.logitrack.shared.BusinessRuleException;
import br.com.logap.logitrack.support.IntegrationTest;
import br.com.logap.logitrack.support.SqlFixtures;

/**
 * Alocacao concorrente de veiculo e motorista — o caminho mais sutil do sistema.
 *
 * A protecao tem duas camadas e cada teste ataca uma:
 *
 *  1. Lock pessimista na linha do veiculo (`findByIdForUpdate`) mais a consulta
 *     `existsActiveVehicle`. Serializa duas partidas do MESMO veiculo.
 *  2. Indice unico parcial no banco (`uk_viagens_em_andamento_motorista`) mais o
 *     `catch (DataIntegrityViolationException)` de `TripService.flushAllocation`.
 *     E a rede que pega o que a camada 1 nao cobre: o MOTORISTA nao tem lock,
 *     entao duas partidas com veiculos diferentes e o mesmo condutor passam as
 *     duas pela verificacao previa e so colidem no flush.
 *
 * O teste 2 e a protecao da divida registrada no ADR 001: aquele `catch` casa o
 * NOME DA CONSTRAINT por string. Uma migration que renomeie o indice faria o
 * erro amigavel virar HTTP 500 — e este teste ficaria vermelho.
 *
 * Sem `@Transactional` de proposito: as threads precisam commitar de verdade
 * para disputarem o indice.
 */
class TripAllocationConcurrencyIT extends IntegrationTest {

    private static final LocalDateTime SAIDA = LocalDateTime.now().plusDays(1).withNano(0);

    @Autowired
    private TripService tripService;

    @Autowired
    private MaintenanceService maintenanceService;

    @Autowired
    private SqlFixtures fixtures;

    @BeforeEach
    void limpar() {
        databaseCleaner.clean();
    }

    /** Roda as duas acoes ao mesmo tempo e devolve o que cada uma lancou (null = sucesso). */
    private List<Throwable> emParalelo(Runnable primeira, Runnable segunda) throws Exception {
        CyclicBarrier largada = new CyclicBarrier(2);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            List<Future<Throwable>> futuros = new ArrayList<>();
            for (Runnable acao : List.of(primeira, segunda)) {
                Callable<Throwable> tarefa = () -> {
                    largada.await(10, TimeUnit.SECONDS);
                    try {
                        acao.run();
                        return null;
                    } catch (Throwable erro) {
                        return erro;
                    }
                };
                futuros.add(pool.submit(tarefa));
            }
            List<Throwable> resultados = new ArrayList<>();
            for (Future<Throwable> futuro : futuros) {
                resultados.add(futuro.get(30, TimeUnit.SECONDS));
            }
            return resultados;
        } finally {
            pool.shutdownNow();
        }
    }

    private static Throwable unico(List<Throwable> resultados) {
        List<Throwable> falhas = resultados.stream().filter(java.util.Objects::nonNull).toList();
        assertThat(falhas).as("exatamente uma das duas operacoes deve falhar").hasSize(1);
        return falhas.getFirst();
    }

    @Test
    @DisplayName("mesmo veiculo: o lock serializa e a segunda partida e recusada")
    void mesmoVeiculoSoIniciaUmaViagem() throws Exception {
        int veiculo = fixtures.veiculo("CON-0001", "Volvo", "PESADO", 2023, "0.00");
        int motoristaA = fixtures.motorista("Ana", "11111111111");
        int motoristaB = fixtures.motorista("Bruno", "22222222222");
        int viagemA = fixtures.viagemProgramadaComMotorista(veiculo, motoristaA, SAIDA, "100.00");
        int viagemB = fixtures.viagemProgramadaComMotorista(veiculo, motoristaB, SAIDA, "100.00");

        Throwable falha = unico(emParalelo(
            () -> tripService.start(viagemA),
            () -> tripService.start(viagemB)));

        assertThat(falha)
            .isInstanceOf(BusinessRuleException.class)
            .hasMessage("O veiculo ja esta em uma viagem em andamento.");
        assertThat(emAndamento()).hasSize(1);
    }

    @Test
    @DisplayName("mesmo motorista: sem lock, a colisao e traduzida no flush")
    void mesmoMotoristaSoIniciaUmaViagem() throws Exception {
        int veiculoA = fixtures.veiculo("CON-0002", "Volvo", "PESADO", 2023, "0.00");
        int veiculoB = fixtures.veiculo("CON-0003", "Scania", "PESADO", 2023, "0.00");
        int motorista = fixtures.motorista("Carla", "33333333333");
        int viagemA = fixtures.viagemProgramadaComMotorista(veiculoA, motorista, SAIDA, "100.00");
        int viagemB = fixtures.viagemProgramadaComMotorista(veiculoB, motorista, SAIDA, "100.00");

        Throwable falha = unico(emParalelo(
            () -> tripService.start(viagemA),
            () -> tripService.start(viagemB)));

        // O ponto do teste: erro de NEGOCIO, nao DataIntegrityViolationException
        // vazando como 500. Se o nome da constraint mudar, isto quebra aqui.
        assertThat(falha)
            .isInstanceOf(BusinessRuleException.class)
            .hasMessage("O motorista ja esta em uma viagem em andamento.");
        assertThat(emAndamento()).hasSize(1);
    }

    @Test
    @DisplayName("mesmo veiculo em manutencao: so uma ordem entra em realizacao")
    void mesmoVeiculoSoEntraEmUmaManutencao() throws Exception {
        int veiculo = fixtures.veiculo("CON-0004", "Volvo", "PESADO", 2023, "0.00");
        int servico = fixtures.servicoCatalogo("Troca de Oleo");
        var hoje = java.time.LocalDate.now();
        int ordemA = fixtures.manutencaoPendente(veiculo, hoje, hoje.plusDays(1));
        fixtures.servicoDaManutencao(ordemA, servico, "100.00");
        int ordemB = fixtures.manutencaoPendente(veiculo, hoje, hoje.plusDays(1));
        fixtures.servicoDaManutencao(ordemB, servico, "100.00");

        Throwable falha = unico(emParalelo(
            () -> maintenanceService.start(ordemA),
            () -> maintenanceService.start(ordemB)));

        assertThat(falha)
            .isInstanceOf(BusinessRuleException.class)
            .hasMessage("O veiculo ja esta em manutencao.");
    }

    @Test
    @DisplayName("veiculo em manutencao nao pode iniciar viagem")
    void veiculoEmManutencaoNaoIniciaViagem() {
        int veiculo = fixtures.veiculo("CON-0005", "Volvo", "PESADO", 2023, "0.00");
        int motorista = fixtures.motorista("Dora", "44444444444");
        var hoje = java.time.LocalDate.now();
        fixtures.manutencaoEmRealizacao(veiculo, hoje, hoje.plusDays(1));
        int viagem = fixtures.viagemProgramadaComMotorista(veiculo, motorista, SAIDA, "100.00");

        assertThat(catchThrowable(() -> tripService.start(viagem)))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessage("O veiculo esta em manutencao.");
    }

    @Test
    @DisplayName("veiculo em viagem nao pode entrar em manutencao")
    void veiculoEmViagemNaoEntraEmManutencao() {
        int veiculo = fixtures.veiculo("CON-0006", "Volvo", "PESADO", 2023, "0.00");
        int motorista = fixtures.motorista("Elias", "55555555555");
        int servico = fixtures.servicoCatalogo("Troca de Oleo");
        fixtures.viagemEmAndamento(veiculo, motorista, SAIDA, "100.00");
        var hoje = java.time.LocalDate.now();
        int ordem = fixtures.manutencaoPendente(veiculo, hoje, hoje.plusDays(1));
        fixtures.servicoDaManutencao(ordem, servico, "100.00");

        assertThat(catchThrowable(() -> maintenanceService.start(ordem)))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessage("O veiculo esta em uma viagem em andamento.");
    }

    private static Throwable catchThrowable(Runnable acao) {
        try {
            acao.run();
            return null;
        } catch (Throwable erro) {
            return erro;
        }
    }

    private List<?> emAndamento() {
        return tripService.list(null, null, TripStatus.EM_ANDAMENTO,
            org.springframework.data.domain.PageRequest.of(0, 50)).getContent();
    }
}
