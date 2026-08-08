package br.com.logap.logitrack.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDateTime;
import java.util.stream.Stream;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import com.fasterxml.jackson.databind.ObjectMapper;

import br.com.logap.logitrack.support.IntegrationTest;

@AutoConfigureMockMvc
class AdministrativeRbacIT extends IntegrationTest {

    private static final String AUTHORIZATION = "Authorization";
    private static final String BEARER = "Bearer ";

    private static final String VEHICLE_REQUEST = """
        {"placa":"RBA1C23","modelo":"Volvo FH","tipo":"PESADO","ano":2024,"kmInicial":0}
        """;
    private static final String DRIVER_REQUEST = """
        {"nome":"Maria da Silva","cnh":"12345678901","telefone":"11999999999"}
        """;
    private static final String SERVICE_REQUEST = """
        {"nome":"Troca de oleo"}
        """;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private String operatorToken;
    private String managerToken;

    @BeforeEach
    void prepareUsers() {
        databaseCleaner.clean();
        operatorToken = tokenFor(createUser("operador@logitrack.com", UserRole.OPERADOR));
        managerToken = tokenFor(createUser("gestor@logitrack.com", UserRole.GESTOR));
    }

    @Test
    void operatorCanReadAdministrativeCatalogs() throws Exception {
        mockMvc.perform(authenticated(get("/api/veiculos"), operatorToken))
            .andExpect(status().isOk());
        mockMvc.perform(authenticated(get("/api/motoristas"), operatorToken))
            .andExpect(status().isOk());
        mockMvc.perform(authenticated(get("/api/servicos-manutencao"), operatorToken))
            .andExpect(status().isOk());
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("administrativeMutations")
    void operatorCannotMutateAdministrativeCatalogs(
        String operation, MockHttpServletRequestBuilder request) throws Exception {

        mockMvc.perform(authenticated(request, operatorToken))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.status").value(403))
            .andExpect(jsonPath("$.error").value("Forbidden"))
            .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
    }

    @Test
    void managerCanCompleteAdministrativeMutationFlows() throws Exception {
        int vehicleId = createAndReadId(post("/api/veiculos")
            .contentType(MediaType.APPLICATION_JSON)
            .content(VEHICLE_REQUEST));

        mockMvc.perform(authenticated(put("/api/veiculos/{id}", vehicleId)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"placa":"RBA1C23","modelo":"Volvo FH 540","tipo":"PESADO","ano":2025,"kmInicial":10}
                    """), managerToken))
            .andExpect(status().isOk());
        mockMvc.perform(authenticated(delete("/api/veiculos/{id}", vehicleId), managerToken))
            .andExpect(status().isNoContent());

        int firstBatchVehicle = createAndReadId(post("/api/veiculos")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"placa":"RBB1C23","modelo":"Scania R","tipo":"PESADO","ano":2024,"kmInicial":0}
                """));
        int secondBatchVehicle = createAndReadId(post("/api/veiculos")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"placa":"RBC1C23","modelo":"Mercedes Atego","tipo":"LEVE","ano":2024,"kmInicial":0}
                """));

        mockMvc.perform(authenticated(delete("/api/veiculos")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"ids":[%d,%d]}
                    """.formatted(firstBatchVehicle, secondBatchVehicle)), managerToken))
            .andExpect(status().isNoContent());

        int driverId = createAndReadId(post("/api/motoristas")
            .contentType(MediaType.APPLICATION_JSON)
            .content(DRIVER_REQUEST));

        mockMvc.perform(authenticated(put("/api/motoristas/{id}", driverId)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"nome":"Maria Souza","cnh":"12345678901","telefone":"11888888888"}
                    """), managerToken))
            .andExpect(status().isOk());
        mockMvc.perform(authenticated(delete("/api/motoristas/{id}", driverId), managerToken))
            .andExpect(status().isNoContent());
        mockMvc.perform(authenticated(patch("/api/motoristas/{id}/reativar", driverId), managerToken))
            .andExpect(status().isOk());

        int serviceId = createAndReadId(post("/api/servicos-manutencao")
            .contentType(MediaType.APPLICATION_JSON)
            .content(SERVICE_REQUEST));

        mockMvc.perform(authenticated(put("/api/servicos-manutencao/{id}", serviceId)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"nome":"Troca de oleo e filtro"}
                    """), managerToken))
            .andExpect(status().isOk());
        mockMvc.perform(authenticated(delete("/api/servicos-manutencao/{id}", serviceId), managerToken))
            .andExpect(status().isNoContent());
        mockMvc.perform(authenticated(
                patch("/api/servicos-manutencao/{id}/reativar", serviceId), managerToken))
            .andExpect(status().isOk());
    }

    private int createAndReadId(MockHttpServletRequestBuilder request) throws Exception {
        String response = mockMvc.perform(authenticated(request, managerToken))
            .andExpect(status().isCreated())
            .andReturn()
            .getResponse()
            .getContentAsString();
        return objectMapper.readTree(response).path("id").asInt();
    }

    private User createUser(String email, UserRole role) {
        return userRepository.save(User.invited(
            email,
            passwordEncoder.encode("senha-forte"),
            role == UserRole.GESTOR ? "Gestor" : "Operador",
            role,
            LocalDateTime.now()));
    }

    private String tokenFor(User user) {
        return jwtService.generate(user, jwtService.expiration());
    }

    private MockHttpServletRequestBuilder authenticated(
        MockHttpServletRequestBuilder request, String token) {
        return request.header(AUTHORIZATION, BEARER + token);
    }

    private static Stream<Arguments> administrativeMutations() {
        return Stream.of(
            Arguments.of("create vehicle", json(post("/api/veiculos"), VEHICLE_REQUEST)),
            Arguments.of("update vehicle", json(put("/api/veiculos/999999"), VEHICLE_REQUEST)),
            Arguments.of("delete vehicle", delete("/api/veiculos/999999")),
            Arguments.of("delete vehicles in batch", json(delete("/api/veiculos"), "{\"ids\":[999999]}")),
            Arguments.of("create driver", json(post("/api/motoristas"), DRIVER_REQUEST)),
            Arguments.of("update driver", json(put("/api/motoristas/999999"), DRIVER_REQUEST)),
            Arguments.of("deactivate driver", delete("/api/motoristas/999999")),
            Arguments.of("reactivate driver", patch("/api/motoristas/999999/reativar")),
            Arguments.of("create maintenance service",
                json(post("/api/servicos-manutencao"), SERVICE_REQUEST)),
            Arguments.of("update maintenance service",
                json(put("/api/servicos-manutencao/999999"), SERVICE_REQUEST)),
            Arguments.of("deactivate maintenance service", delete("/api/servicos-manutencao/999999")),
            Arguments.of("reactivate maintenance service",
                patch("/api/servicos-manutencao/999999/reativar"))
        );
    }

    private static MockHttpServletRequestBuilder json(
        MockHttpServletRequestBuilder request, String content) {
        return request.contentType(MediaType.APPLICATION_JSON).content(content);
    }
}
