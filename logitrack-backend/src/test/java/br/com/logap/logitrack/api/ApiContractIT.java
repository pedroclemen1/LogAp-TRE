package br.com.logap.logitrack.api;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasKey;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import br.com.logap.logitrack.auth.JwtService;
import br.com.logap.logitrack.auth.User;
import br.com.logap.logitrack.auth.UserRepository;
import br.com.logap.logitrack.auth.UserRole;
import br.com.logap.logitrack.support.IntegrationTest;
import br.com.logap.logitrack.support.SqlFixtures;

/**
 * Contrato HTTP visto pelo frontend.
 *
 * O foco nao e cobrir todo endpoint: e travar exatamente aquilo de que o BFF
 * Next depende e que quebraria em silencio se mudasse.
 *
 * O caso mais importante e o mapa `campos` do HTTP 400. O frontend casa as
 * CHAVES desse mapa direto com o atributo `name` de cada input do formulario
 * (ver o comentario em `features/fleet/model/vehicle-form.ts`). Renomear
 * `placa` para `plate` no DTO nao quebra nenhum teste de servico — mas apaga
 * os erros por campo da tela, sem erro no console.
 */
@AutoConfigureMockMvc
class ApiContractIT extends IntegrationTest {

    private static final String EMAIL = "operador@logitrack.com";
    private static final String SENHA = "logap123";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private SqlFixtures fixtures;

    @BeforeEach
    void preparar() {
        databaseCleaner.clean();
        fixtures.usuario(EMAIL, new BCryptPasswordEncoder().encode(SENHA), "Operador",
            UserRole.GESTOR, false, true);
    }

    private String tokenValido() {
        User user = userRepository.findByEmailIgnoreCaseAndAtivoTrue(EMAIL).orElseThrow();
        return jwtService.generate(user, jwtService.expiration());
    }

    @Nested
    @DisplayName("healthcheck autenticado")
    class HealthcheckAutenticado {

        @Test
        void semTokenDevolve401() throws Exception {
            mockMvc.perform(get("/api/health"))
                .andExpect(status().isUnauthorized());
        }

        @Test
        void tokenValidoConfirmaQueApiEstaRodando() throws Exception {
            mockMvc.perform(get("/api/health")
                    .header("Authorization", "Bearer " + tokenValido()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("api is running"));
        }
    }

    @Nested
    @DisplayName("autenticacao")
    class Autenticacao {

        @Test
        void loginValidoDevolveTokenEExpiracao() throws Exception {
            mockMvc.perform(post("/api/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                        {"email": "%s", "senha": "%s"}
                        """.formatted(EMAIL, SENHA)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token", notNullValue()))
                // O front amarra a validade do cookie httpOnly a este campo.
                .andExpect(jsonPath("$.expiraEm", notNullValue()))
                .andExpect(jsonPath("$.email").value(EMAIL))
                .andExpect(jsonPath("$.perfil").value("GESTOR"))
                .andExpect(jsonPath("$.trocaSenhaObrigatoria").value(false));
        }

        /** Texto exato: o front casa esta mensagem para traduzir o erro de login. */
        @Test
        void senhaErradaDevolve401ComMensagemDeContrato() throws Exception {
            mockMvc.perform(post("/api/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                        {"email": "%s", "senha": "errada"}
                        """.formatted(EMAIL)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("E-mail ou senha invalidos."));
        }

        @Test
        void rotaProtegidaSemTokenDevolve401() throws Exception {
            mockMvc.perform(get("/api/veiculos"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("Token ausente ou invalido."));
        }

        /**
         * O front depende disto: o 401 dispara `/api/auth/expirar`, que apaga o
         * cookie antes de voltar ao login — sem isso, laco de redirecionamento.
         *
         * O token expirado e emitido direto, sem esperar: so foi possivel
         * porque o `JwtService` recebe a expiracao como parametro.
         */
        @Test
        void tokenExpiradoDevolve401() throws Exception {
            User user = userRepository.findByEmailIgnoreCaseAndAtivoTrue(EMAIL).orElseThrow();
            String expirado = jwtService.generate(user, Instant.now().minusSeconds(60));

            mockMvc.perform(get("/api/veiculos").header("Authorization", "Bearer " + expirado))
                .andExpect(status().isUnauthorized());
        }

        /** Adultera o PAYLOAD: e a tentativa real de escalar privilegio. */
        @Test
        void tokenComPayloadAdulteradoDevolve401() throws Exception {
            String[] partes = tokenValido().split("\\.");
            String payloadAdulterado = java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(
                """
                {"sub":"invasor@exemplo.com","perfil":"GESTOR"}""".getBytes(java.nio.charset.StandardCharsets.UTF_8));
            String forjado = partes[0] + "." + payloadAdulterado + "." + partes[2];

            mockMvc.perform(get("/api/veiculos").header("Authorization", "Bearer " + forjado))
                .andExpect(status().isUnauthorized());
        }

        @Test
        void tokenSemSentidoDevolve401() throws Exception {
            mockMvc.perform(get("/api/veiculos").header("Authorization", "Bearer nao.e.um.jwt"))
                .andExpect(status().isUnauthorized());
        }

        @Test
        void tokenValidoLiberaARota() throws Exception {
            mockMvc.perform(get("/api/veiculos").header("Authorization", "Bearer " + tokenValido()))
                .andExpect(status().isOk());
        }
    }

    @Nested
    @DisplayName("erro de validacao (HTTP 400)")
    class Validacao {

        /**
         * AS CHAVES DE `campos` SAO CONTRATO DE UI. Se mudarem, o formulario da
         * Frota para de mostrar erro por campo — sem nenhum sintoma no console.
         */
        @Test
        void camposUsaOsNomesDosInputsDoFormulario() throws Exception {
            mockMvc.perform(post("/api/veiculos")
                    .header("Authorization", "Bearer " + tokenValido())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                        {"placa": null, "modelo": null, "tipo": null, "ano": null, "kmInicial": null}
                        """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.campos", notNullValue()))
                .andExpect(jsonPath("$.campos.placa").value("Informe a placa."))
                .andExpect(jsonPath("$.campos.modelo").value("Informe o modelo."))
                .andExpect(jsonPath("$.campos.tipo").value("Selecione o tipo do veiculo."))
                .andExpect(jsonPath("$.campos.kmInicial")
                    .value("Informe a quilometragem. Use 0 para veiculo zero-quilometro."));
        }

        @Test
        void placaComFormatoInvalidoUsaAMensagemDeContrato() throws Exception {
            mockMvc.perform(post("/api/veiculos")
                    .header("Authorization", "Bearer " + tokenValido())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                        {"placa": "123", "modelo": "Volvo", "tipo": "PESADO", "ano": 2023, "kmInicial": 0}
                        """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.placa")
                    .value("Placa invalida. Use o formato ABC-1234 ou ABC1D23."));
        }

        @Test
        void loginSemCredenciaisPreencheCampos() throws Exception {
            mockMvc.perform(post("/api/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                        {"email": "", "senha": ""}
                        """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.email").value("Informe o e-mail."))
                .andExpect(jsonPath("$.campos.senha").value("Informe a senha."));
        }

        @Test
        void jsonInvalidoDevolveErroEstavel() throws Exception {
            mockMvc.perform(post("/api/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{json-invalido"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("MALFORMED_REQUEST"));
        }
    }

    @Nested
    @DisplayName("forma do ApiError")
    class FormaDoErro {

        /**
         * `default-property-inclusion: non_null` faz o campo nulo DESAPARECER do
         * JSON. O front tipa o corpo como `campos?`, nunca `campos | null` —
         * um nulo explicito quebraria essa premissa. Ver `shared/api/api-error.ts`.
         */
        @Test
        void camposAusenteQuandoNaoHaErroDeValidacao() throws Exception {
            mockMvc.perform(delete("/api/veiculos/999999").header("Authorization", "Bearer " + tokenValido()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$").value(not(hasKey("campos"))));
        }

        @Test
        void erroTemAsChavesQueOFrontLe() throws Exception {
            mockMvc.perform(delete("/api/veiculos/999999").header("Authorization", "Bearer " + tokenValido()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.timestamp", notNullValue()))
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error").value("Not Found"))
                .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"))
                .andExpect(jsonPath("$.message", notNullValue()))
                .andExpect(jsonPath("$.path").value("/api/veiculos/999999"));
        }

        /**
         * A mensagem de "nao encontrado" e casada por REGEX no front
         * (`^.+ de id (\\d+) nao encontrado\\.$`). Mudar o formato faz o texto
         * cair no fallback generico em ingles.
         */
        @Test
        void mensagemDeNaoEncontradoSegueOFormatoQueOFrontCasa() throws Exception {
            mockMvc.perform(delete("/api/veiculos/999999").header("Authorization", "Bearer " + tokenValido()))
                .andExpect(jsonPath("$.message").value("Veiculo de id 999999 nao encontrado."));
        }

        /** Regra de negocio e 422, nao 400: o front separa os dois tratamentos. */
        @Test
        void regraDeNegocioDevolve422() throws Exception {
            int veiculo = fixtures.veiculo("CTR-0001", "Volvo", "PESADO", 2023, "0.00");
            fixtures.viagemProgramada(veiculo, java.time.LocalDateTime.now().plusDays(1), "10.00");

            mockMvc.perform(delete("/api/veiculos")
                    .header("Authorization", "Bearer " + tokenValido())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                        {"ids": [%d]}
                        """.formatted(veiculo)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.status").value(422));
        }
    }

    @Nested
    @DisplayName("paginacao")
    class Paginacao {

        @Test
        void listaDevolveOEnvelopeQueOFrontEspera() throws Exception {
            fixtures.veiculo("PAG-0001", "Volvo", "PESADO", 2023, "0.00");
            fixtures.veiculo("PAG-0002", "Scania", "PESADO", 2023, "0.00");

            mockMvc.perform(get("/api/veiculos/frota?page=0&size=1")
                    .header("Authorization", "Bearer " + tokenValido()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", notNullValue()))
                .andExpect(jsonPath("$.content.length()").value(1))
                // PagedModel: os totais ficam sob "page", nao na raiz. E o
                // formato estavel que o PaginationConfig fixou de proposito.
                .andExpect(jsonPath("$.page.totalElements").value(2))
                .andExpect(jsonPath("$.page.totalPages").value(2))
                .andExpect(jsonPath("$.page.number").value(0))
                .andExpect(jsonPath("$.page.size").value(1));
        }

        @Test
        void primeiraPaginaTrazOsRegistrosEsperados() throws Exception {
            fixtures.veiculo("PAG-0003", "Volvo", "PESADO", 2023, "0.00");
            fixtures.veiculo("PAG-0004", "Scania", "PESADO", 2023, "0.00");

            mockMvc.perform(get("/api/veiculos/frota")
                    .header("Authorization", "Bearer " + tokenValido()))
                .andExpect(jsonPath("$.content[*].placa",
                    containsInAnyOrder("PAG-0003", "PAG-0004")));
        }
    }
}
