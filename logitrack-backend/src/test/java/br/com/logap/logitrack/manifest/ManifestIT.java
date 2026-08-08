package br.com.logap.logitrack.manifest;

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

import br.com.logap.logitrack.driver.DriverRepository;
import br.com.logap.logitrack.manifest.dto.ManifestCandidateResponse;
import br.com.logap.logitrack.manifest.dto.ManifestItemRequest;
import br.com.logap.logitrack.manifest.dto.ManifestRequest;
import br.com.logap.logitrack.manifest.dto.ManifestResponse;
import br.com.logap.logitrack.manifest.dto.ManifestStageResponse;
import br.com.logap.logitrack.shared.BusinessRuleException;
import br.com.logap.logitrack.shared.ResourceNotFoundException;
import br.com.logap.logitrack.support.IntegrationTest;
import br.com.logap.logitrack.support.SqlFixtures;
import br.com.logap.logitrack.trip.TripService;
import br.com.logap.logitrack.trip.TripStage;
import br.com.logap.logitrack.trip.TripStageRepository;
import br.com.logap.logitrack.trip.TripStatus;
import br.com.logap.logitrack.trip.dto.TripRequest;
import br.com.logap.logitrack.trip.dto.TripStageRequest;
import br.com.logap.logitrack.vehicle.VehicleService;
import br.com.logap.logitrack.vehicle.VehicleType;
import br.com.logap.logitrack.vehicle.dto.VehicleRequest;

/**
 * Romaneio de carga — UM POR TRECHO.
 *
 * O que estes testes protegem, em ordem de importancia:
 *
 *  1. O documento cobre um TRECHO, nao a viagem: origem e o ponto anterior,
 *     destino e a cidade do trecho, distancia e o km daquela perna.
 *  2. Basta o TRECHO estar concluido — a viagem pode seguir em andamento.
 *  3. Um romaneio por trecho; trechos diferentes da mesma viagem geram
 *     documentos distintos.
 *  4. O documento e SNAPSHOT: mexer no cadastro depois nao o altera.
 *  5. A autenticacao impressa deriva do conteudo, nao e sorteada.
 */
class ManifestIT extends IntegrationTest {

    private static final LocalDateTime SAIDA = LocalDateTime.now().plusDays(1).withNano(0);

    @Autowired
    private ManifestService service;

    @Autowired
    private TripService tripService;

    @Autowired
    private TripStageRepository stageRepository;

    @Autowired
    private SqlFixtures fixtures;

    @Autowired
    private VehicleService vehicleService;

    @Autowired
    private DriverRepository driverRepository;

    private int veiculoId;
    private int motoristaId;

    @BeforeEach
    void preparar() {
        databaseCleaner.clean();
        veiculoId = fixtures.veiculo("RMN-0001", "Volvo FH", "PESADO", 2023, "0.00");
        motoristaId = fixtures.motorista("Carlos A. Silva", "10000000001");
    }

    /** Viagem com os destinos informados, cada trecho com 241 km. */
    private int viagem(Integer motorista, String... destinos) {
        List<TripStageRequest> trechos = java.util.Arrays.stream(destinos)
            .map(destino -> new TripStageRequest(
                null, destino, new BigDecimal("241.00"), new BigDecimal("1500.00"), null))
            .toList();
        return tripService.create(
            new TripRequest(veiculoId, motorista, SAIDA, "CD Cajamar - SP", trechos)).id();
    }

    private List<TripStage> trechos(int viagemId) {
        return stageRepository.findByViagemIdOrderByOrdemAsc(viagemId);
    }

    /** Inicia a viagem e conclui os N primeiros trechos, na ordem. */
    private int viagemComTrechosConcluidos(int quantos, String... destinos) {
        int id = viagem(motoristaId, destinos);
        tripService.start(id);
        List<TripStage> rota = trechos(id);
        for (int index = 0; index < quantos; index++) {
            tripService.completeStage(id, rota.get(index).getId());
        }
        return id;
    }

    private static ManifestRequest pedido(int etapaId, ManifestItemRequest... itens) {
        return new ManifestRequest(
            etapaId,
            "TransLogistica Brasil S/A",
            "12345678000190",
            "48291048",
            "Carreta Bau 3 Eixos",
            "Rod. Anhanguera, Km 38 - Cajamar, SP",
            "BR-116, Km 10 - Curitiba, PR",
            List.of(itens));
    }

    private static ManifestItemRequest item(String nf, String destinatario, int volumes, String peso) {
        return new ManifestItemRequest(nf, destinatario, volumes, new BigDecimal(peso));
    }

    @Nested
    @DisplayName("emissao por trecho")
    class Emissao {

        /**
         * O TESTE CENTRAL: o documento descreve a perna, nao a viagem. Origem e
         * a origem da viagem porque este e o trecho 1; a distancia e a do trecho
         * (241), nao a soma da rota (482).
         */
        @Test
        void oPrimeiroTrechoParteDaOrigemDaViagem() {
            int viagemId = viagemComTrechosConcluidos(1, "CD Curitiba - PR", "Florianopolis - SC");
            int etapa1 = trechos(viagemId).get(0).getId();

            ManifestResponse romaneio = service.issue(pedido(etapa1,
                item("NF-001248", "Industrias Alfa Ltda", 12, "450.5")));

            assertThat(romaneio.origemNome()).isEqualTo("CD Cajamar - SP");
            assertThat(romaneio.destinoNome()).isEqualTo("CD Curitiba - PR");
            assertThat(romaneio.distanciaKm()).isEqualByComparingTo("241.00");
            assertThat(romaneio.trechoOrdem()).isEqualTo((short) 1);
        }

        /** Trecho N parte da cidade do trecho N-1. */
        @Test
        void oSegundoTrechoParteDaCidadeDoPrimeiro() {
            int viagemId = viagemComTrechosConcluidos(2, "CD Curitiba - PR", "Florianopolis - SC");
            int etapa2 = trechos(viagemId).get(1).getId();

            ManifestResponse romaneio = service.issue(pedido(etapa2, item("NF-2", "Beta", 1, "10.0")));

            assertThat(romaneio.origemNome()).isEqualTo("CD Curitiba - PR");
            assertThat(romaneio.destinoNome()).isEqualTo("Florianopolis - SC");
            assertThat(romaneio.trechoOrdem()).isEqualTo((short) 2);
        }

        /** A regra e do TRECHO: a viagem segue em andamento e o documento sai. */
        @Test
        void emiteComAViagemAindaEmAndamento() {
            int viagemId = viagemComTrechosConcluidos(1, "CD Curitiba - PR", "Florianopolis - SC");
            int etapa1 = trechos(viagemId).get(0).getId();

            service.issue(pedido(etapa1, item("NF-1", "Alfa", 1, "10.0")));

            assertThat(tripService.findById(viagemId).status()).isEqualTo(TripStatus.EM_ANDAMENTO);
        }

        @Test
        void trechosDiferentesGeramDocumentosDistintos() {
            int viagemId = viagemComTrechosConcluidos(2, "CD Curitiba - PR", "Florianopolis - SC");
            List<TripStage> rota = trechos(viagemId);

            ManifestResponse primeiro = service.issue(pedido(rota.get(0).getId(),
                item("NF-1", "Alfa", 1, "10.0")));
            ManifestResponse segundo = service.issue(pedido(rota.get(1).getId(),
                item("NF-2", "Beta", 1, "10.0")));

            assertThat(segundo.id()).isNotEqualTo(primeiro.id());
            assertThat(segundo.numero()).isNotEqualTo(primeiro.numero());
            assertThat(primeiro.numero()).matches("RC-\\d{4}-\\d{4}");
        }

        @Test
        void copiaMotoristaCnhEPlacaDaViagem() {
            int viagemId = viagemComTrechosConcluidos(1, "CD Curitiba - PR");
            int etapa1 = trechos(viagemId).get(0).getId();

            ManifestResponse romaneio = service.issue(pedido(etapa1, item("NF-1", "Alfa", 1, "10.0")));

            assertThat(romaneio.motoristaNome()).isEqualTo("Carlos A. Silva");
            assertThat(romaneio.motoristaCnh()).isEqualTo("10000000001");
            assertThat(romaneio.veiculoPlaca()).isEqualTo("RMN-0001");
            // Do formulario, porque o cadastro nao tem.
            assertThat(romaneio.veiculoDescricao()).isEqualTo("Carreta Bau 3 Eixos");
        }

        @Test
        void numeraOsItensNaOrdemRecebidaESomaOsTotais() {
            int viagemId = viagemComTrechosConcluidos(1, "CD Curitiba - PR");
            int etapa1 = trechos(viagemId).get(0).getId();

            ManifestResponse romaneio = service.issue(pedido(etapa1,
                item("NF-001248", "Industrias Alfa Ltda", 12, "450.5"),
                item("NF-001249", "Comercio Beta S/A", 5, "120.0"),
                item("NF-001250", "Distribuidora Gama", 24, "890.2")));

            assertThat(romaneio.itens()).extracting(i -> i.sequencia().intValue())
                .containsExactly(1, 2, 3);
            assertThat(romaneio.totalVolumes()).isEqualTo(41);
            assertThat(romaneio.totalPesoKg()).isEqualByComparingTo("1460.7");
        }

        /** Codigo do rodape: derivado do conteudo, para conferir papel x registro. */
        @Test
        void autenticacaoTemDezesseisHexEEDeterministica() {
            int viagemId = viagemComTrechosConcluidos(1, "CD Curitiba - PR");
            int etapa1 = trechos(viagemId).get(0).getId();

            ManifestResponse romaneio = service.issue(pedido(etapa1, item("NF-1", "Alfa", 1, "10.0")));

            assertThat(romaneio.autenticacao()).matches("[0-9a-f]{16}");
            assertThat(service.findById(romaneio.id()).autenticacao())
                .isEqualTo(romaneio.autenticacao());
        }

        @Test
        void buscaODocumentoPeloTrecho() {
            int viagemId = viagemComTrechosConcluidos(1, "CD Curitiba - PR");
            int etapa1 = trechos(viagemId).get(0).getId();
            ManifestResponse emitido = service.issue(pedido(etapa1, item("NF-1", "Alfa", 1, "10.0")));

            assertThat(service.findByStage(etapa1).id()).isEqualTo(emitido.id());
        }
    }

    @Nested
    @DisplayName("regras de bloqueio")
    class Bloqueios {

        @Test
        void trechoPendenteNaoEmite() {
            int viagemId = viagemComTrechosConcluidos(1, "CD Curitiba - PR", "Florianopolis - SC");
            int etapa2 = trechos(viagemId).get(1).getId();

            assertThatThrownBy(() -> service.issue(pedido(etapa2, item("NF-1", "Alfa", 1, "10.0"))))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Conclua o trecho antes de emitir o romaneio.");
        }

        @Test
        void trechoDeViagemNaoIniciadaNaoEmite() {
            int viagemId = viagem(motoristaId, "CD Curitiba - PR");
            int etapa1 = trechos(viagemId).get(0).getId();

            assertThatThrownBy(() -> service.issue(pedido(etapa1, item("NF-1", "Alfa", 1, "10.0"))))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Conclua o trecho antes de emitir o romaneio.");
        }

        @Test
        void umRomaneioPorTrecho() {
            int viagemId = viagemComTrechosConcluidos(1, "CD Curitiba - PR");
            int etapa1 = trechos(viagemId).get(0).getId();
            service.issue(pedido(etapa1, item("NF-1", "Alfa", 1, "10.0")));

            assertThatThrownBy(() -> service.issue(pedido(etapa1, item("NF-2", "Beta", 1, "10.0"))))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Este trecho ja possui romaneio emitido.");
        }

        @Test
        void notaFiscalRepetidaERecusada() {
            int viagemId = viagemComTrechosConcluidos(1, "CD Curitiba - PR");
            int etapa1 = trechos(viagemId).get(0).getId();

            assertThatThrownBy(() -> service.issue(pedido(etapa1,
                item("NF-001248", "Alfa", 1, "10.0"),
                item("nf-001248", "Beta", 2, "20.0"))))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("A mesma nota fiscal foi informada mais de uma vez.");
        }

        @Test
        void trechoInexistenteDevolveNaoEncontrado() {
            assertThatThrownBy(() -> service.issue(pedido(999999, item("NF-1", "Alfa", 1, "10.0"))))
                .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("o documento nao muda depois de emitido")
    class Snapshot {

        @Test
        void alterarOCadastroNaoAlteraORomaneio() {
            int viagemId = viagemComTrechosConcluidos(1, "CD Curitiba - PR");
            int etapa1 = trechos(viagemId).get(0).getId();
            ManifestResponse emitido = service.issue(pedido(etapa1,
                item("NF-001248", "Industrias Alfa Ltda", 12, "450.5")));

            vehicleService.update(veiculoId, new VehicleRequest(
                "ZZZ-9999", "Outro Modelo", VehicleType.LEVE, 2020, new BigDecimal("0.00")));
            driverRepository.findById(motoristaId).orElseThrow()
                .atualizar("Outro Nome", "99999999999", null);
            driverRepository.flush();

            ManifestResponse relido = service.findById(emitido.id());
            assertThat(relido.veiculoPlaca()).isEqualTo("RMN-0001");
            assertThat(relido.motoristaNome()).isEqualTo("Carlos A. Silva");
            assertThat(relido.motoristaCnh()).isEqualTo("10000000001");
            assertThat(relido.origemNome()).isEqualTo("CD Cajamar - SP");
            assertThat(relido.distanciaKm()).isEqualByComparingTo("241.00");
        }
    }

    @Nested
    @DisplayName("edicao do documento")
    class Edicao {

        @Test
        void corrigeItensETransportadoraMantendoONumero() {
            int viagemId = viagemComTrechosConcluidos(1, "CD Curitiba - PR");
            int etapa1 = trechos(viagemId).get(0).getId();
            ManifestResponse emitido = service.issue(pedido(etapa1, item("NF-ERRADA", "Alfa", 1, "10.0")));
            // `LocalDateTime` da JVM tem nanossegundos e `timestamp` do Postgres
            // so microssegundos: comparar duas leituras do banco isola isso.
            ManifestResponse persistido = service.findById(emitido.id());

            ManifestResponse corrigido = service.update(emitido.id(), new ManifestRequest(
                etapa1, "Outra Transportadora S/A", "99999999000199", "77777",
                "Truck Bau", "Novo endereco origem", "Novo endereco destino",
                List.of(new ManifestItemRequest("NF-CERTA", "Beta", 7, new BigDecimal("77.7")))));

            assertThat(corrigido.numero()).isEqualTo(emitido.numero());
            assertThat(corrigido.emitidoEm()).isEqualTo(persistido.emitidoEm());
            assertThat(corrigido.transportadoraRazaoSocial()).isEqualTo("Outra Transportadora S/A");
            assertThat(corrigido.itens()).singleElement()
                .satisfies(i -> assertThat(i.notaFiscal()).isEqualTo("NF-CERTA"));
            assertThat(corrigido.totalVolumes()).isEqualTo(7);
        }

        /** A autenticacao deriva do conteudo: documento corrigido, codigo novo. */
        @Test
        void autenticacaoMudaQuandoOConteudoMuda() {
            int viagemId = viagemComTrechosConcluidos(1, "CD Curitiba - PR");
            int etapa1 = trechos(viagemId).get(0).getId();
            ManifestResponse emitido = service.issue(pedido(etapa1, item("NF-1", "Alfa", 1, "10.0")));

            ManifestResponse corrigido = service.update(emitido.id(), new ManifestRequest(
                etapa1, "TransLogistica Brasil S/A", "12345678000190", "48291048",
                "Carreta Bau 3 Eixos", null, null,
                List.of(new ManifestItemRequest("NF-1", "Alfa", 99, new BigDecimal("10.0")))));

            assertThat(corrigido.autenticacao())
                .matches("[0-9a-f]{16}")
                .isNotEqualTo(emitido.autenticacao());
        }

        @Test
        void autenticacaoMudaQuandoItemMudaMesmoComOsMesmosTotais() {
            int viagemId = viagemComTrechosConcluidos(1, "CD Curitiba - PR");
            int etapa1 = trechos(viagemId).get(0).getId();
            ManifestResponse emitido = service.issue(pedido(etapa1, item("NF-1", "Alfa", 1, "10.0")));

            ManifestResponse corrigido = service.update(
                emitido.id(), pedido(etapa1, item("NF-2", "Beta", 1, "10.0")));

            assertThat(corrigido.totalVolumes()).isEqualTo(emitido.totalVolumes());
            assertThat(corrigido.totalPesoKg()).isEqualByComparingTo(emitido.totalPesoKg());
            assertThat(corrigido.autenticacao()).isNotEqualTo(emitido.autenticacao());
        }

        /** Corrigir o documento nao reatribui a rota: origem e destino seguem do snapshot. */
        @Test
        void naoPermiteTrocarRotaNemVeiculoPelaEdicao() {
            int viagemId = viagemComTrechosConcluidos(1, "CD Curitiba - PR");
            int etapa1 = trechos(viagemId).get(0).getId();
            ManifestResponse emitido = service.issue(pedido(etapa1, item("NF-1", "Alfa", 1, "10.0")));

            ManifestResponse corrigido = service.update(emitido.id(), new ManifestRequest(
                etapa1, "X S/A", "00000000000100", null, "Outro veiculo", null, null,
                List.of(new ManifestItemRequest("NF-1", "Alfa", 1, new BigDecimal("10.0")))));

            assertThat(corrigido.veiculoPlaca()).isEqualTo("RMN-0001");
            assertThat(corrigido.origemNome()).isEqualTo("CD Cajamar - SP");
            assertThat(corrigido.destinoNome()).isEqualTo("CD Curitiba - PR");
            assertThat(corrigido.distanciaKm()).isEqualByComparingTo("241.00");
        }
    }

    @Nested
    @DisplayName("tela de gestao")
    class Gestao {

        @Test
        void listagemTrazAViagemComSeusTrechos() {
            int viagemId = viagemComTrechosConcluidos(1, "CD Curitiba - PR", "Florianopolis - SC");

            var pagina = service.listCandidates(null, null, null, PageRequest.of(0, 20));

            assertThat(pagina.getContent()).singleElement().satisfies(viagem -> {
                assertThat(viagem.viagemId()).isEqualTo(viagemId);
                assertThat(viagem.trechos()).hasSize(2);
                assertThat(viagem.trechos()).extracting(ManifestStageResponse::origem)
                    .containsExactly("CD Cajamar - SP", "CD Curitiba - PR");
                assertThat(viagem.trechos()).extracting(ManifestStageResponse::destino)
                    .containsExactly("CD Curitiba - PR", "Florianopolis - SC");
                assertThat(viagem.trechos()).extracting(ManifestStageResponse::concluido)
                    .containsExactly(true, false);
            });
        }

        @Test
        void trechoJaEmitidoTrazOIdDoRomaneio() {
            int viagemId = viagemComTrechosConcluidos(1, "CD Curitiba - PR");
            int etapa1 = trechos(viagemId).get(0).getId();
            int romaneioId = service.issue(pedido(etapa1, item("NF-1", "Alfa", 1, "10.0"))).id();

            var trechosDaTela = service.listCandidates(null, null, null, PageRequest.of(0, 20))
                .getContent().getFirst().trechos();

            assertThat(trechosDaTela).singleElement()
                .satisfies(t -> assertThat(t.romaneioId()).isEqualTo(romaneioId));
        }

        @Test
        void trechoSemRomaneioNaoTrazId() {
            viagemComTrechosConcluidos(1, "CD Curitiba - PR");

            var trechosDaTela = service.listCandidates(null, null, null, PageRequest.of(0, 20))
                .getContent().getFirst().trechos();

            assertThat(trechosDaTela).singleElement()
                .satisfies(t -> assertThat(t.romaneioId()).isNull());
        }

        @Test
        void listagemAceitaOsFiltrosDaTelaDeViagens() {
            int concluida = viagemComTrechosConcluidos(1, "CD Curitiba - PR");
            int outroVeiculo = fixtures.veiculo("RMN-0002", "Scania", "PESADO", 2023, "0.00");
            int programada = tripService.create(new TripRequest(outroVeiculo, null, SAIDA, "Santos",
                List.of(new TripStageRequest(
                    null, "Sao Paulo", new BigDecimal("80.00"), new BigDecimal("500.00"), null)))).id();

            assertThat(service.listCandidates(null, null, TripStatus.PROGRAMADA, PageRequest.of(0, 20))
                .getContent()).extracting(ManifestCandidateResponse::viagemId).containsExactly(programada);
            assertThat(service.listCandidates(null, veiculoId, null, PageRequest.of(0, 20))
                .getContent()).extracting(ManifestCandidateResponse::viagemId).containsExactly(concluida);
            assertThat(service.listCandidates("santos", null, null, PageRequest.of(0, 20))
                .getContent()).extracting(ManifestCandidateResponse::viagemId).containsExactly(programada);
        }

        /** O total precisa bater com o conteudo: nada e filtrado depois de paginar. */
        @Test
        void totalDaPaginaBateComOConteudo() {
            viagemComTrechosConcluidos(1, "CD Curitiba - PR");
            int outroVeiculo = fixtures.veiculo("RMN-0003", "Scania", "PESADO", 2023, "0.00");
            int cancelada = tripService.create(new TripRequest(outroVeiculo, null, SAIDA, "Santos",
                List.of(new TripStageRequest(
                    null, "Sao Paulo", new BigDecimal("80.00"), new BigDecimal("500.00"), null)))).id();
            tripService.cancel(cancelada);

            var pagina = service.listCandidates(null, null, null, PageRequest.of(0, 20));

            assertThat(pagina.getContent()).hasSize(2);
            assertThat(pagina.getTotalElements()).isEqualTo(2);
        }
    }
}
