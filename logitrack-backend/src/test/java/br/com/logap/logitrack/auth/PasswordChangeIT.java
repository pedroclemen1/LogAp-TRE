package br.com.logap.logitrack.auth;

import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.fasterxml.jackson.databind.ObjectMapper;

import br.com.logap.logitrack.support.IntegrationTest;
import br.com.logap.logitrack.support.SqlFixtures;

@AutoConfigureMockMvc
class PasswordChangeIT extends IntegrationTest {

    private static final String EMAIL = "gestor@empresa.com";
    private static final String CURRENT_PASSWORD = "senha-inicial-forte";
    private static final String NEW_PASSWORD = "senha-definitiva-forte";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private SqlFixtures fixtures;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void prepare() {
        databaseCleaner.clean();
        fixtures.usuario(EMAIL, passwordEncoder.encode(CURRENT_PASSWORD), "Gestor",
            UserRole.GESTOR, true, true);
    }

    @Test
    void loginSignalsRequiredChangeAndBlocksOtherRoutes() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginBody(CURRENT_PASSWORD)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.trocaSenhaObrigatoria").value(true));

        mockMvc.perform(get("/api/veiculos").header("Authorization", bearerToken()))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value("PASSWORD_CHANGE_REQUIRED"));
    }

    @Test
    void rejectsWrongCurrentPasswordAndWeakOrReusedPassword() throws Exception {
        mockMvc.perform(changePassword("incorreta", NEW_PASSWORD))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.code").value("INVALID_CURRENT_PASSWORD"));

        mockMvc.perform(changePassword(CURRENT_PASSWORD, "curta"))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.code").value("WEAK_PASSWORD"));

        mockMvc.perform(changePassword(CURRENT_PASSWORD, CURRENT_PASSWORD))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.code").value("PASSWORD_REUSE"));
    }

    @Test
    void changesPasswordClearsRequirementAndInvalidatesOldCredential() throws Exception {
        String oldToken = bearerToken();
        MvcResult result = mockMvc.perform(changePassword(CURRENT_PASSWORD, NEW_PASSWORD, oldToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.trocaSenhaObrigatoria").value(false))
            .andReturn();

        String newToken = objectMapper.readTree(result.getResponse().getContentAsString())
            .path("token")
            .asText();
        assertNotEquals(oldToken.substring("Bearer ".length()), newToken);

        mockMvc.perform(get("/api/veiculos").header("Authorization", oldToken))
            .andExpect(status().isUnauthorized());

        User updated = userRepository.findByEmailIgnoreCase(EMAIL).orElseThrow();
        mockMvc.perform(get("/api/veiculos").header("Authorization", "Bearer " + newToken))
            .andExpect(status().isOk());

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginBody(CURRENT_PASSWORD)))
            .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginBody(NEW_PASSWORD)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.trocaSenhaObrigatoria").value(false));
    }

    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder changePassword(
        String currentPassword, String newPassword) {
        return changePassword(currentPassword, newPassword, bearerToken());
    }

    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder changePassword(
        String currentPassword, String newPassword, String authorization) {
        return patch("/api/auth/password")
            .header("Authorization", authorization)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"senhaAtual":"%s","novaSenha":"%s"}
                """.formatted(currentPassword, newPassword));
    }

    private String bearerToken() {
        User user = userRepository.findByEmailIgnoreCaseAndAtivoTrue(EMAIL).orElseThrow();
        return "Bearer " + jwtService.generate(user, jwtService.expiration());
    }

    private String loginBody(String password) {
        return """
            {"email":"%s","senha":"%s"}
            """.formatted(EMAIL, password);
    }
}
