package br.com.logap.logitrack.auth.invitation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.net.URI;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.web.util.UriComponentsBuilder;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import br.com.logap.logitrack.auth.JwtService;
import br.com.logap.logitrack.auth.User;
import br.com.logap.logitrack.auth.UserRepository;
import br.com.logap.logitrack.auth.UserRole;
import br.com.logap.logitrack.auth.invitation.dto.AcceptInvitationRequest;
import br.com.logap.logitrack.support.IntegrationTest;
import br.com.logap.logitrack.support.SqlFixtures;

@AutoConfigureMockMvc
class InvitationIT extends IntegrationTest {

    private static final String MANAGER_EMAIL = "gestor@empresa.com";
    private static final String OPERATOR_EMAIL = "operador@empresa.com";
    private static final String INVITED_EMAIL = "convidado@empresa.com";
    private static final String PASSWORD = "senha-de-convite-forte";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserInvitationRepository invitationRepository;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private SqlFixtures fixtures;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private InvitationService invitationService;

    @BeforeEach
    void prepare() {
        databaseCleaner.clean();
        fixtures.usuario(MANAGER_EMAIL, passwordEncoder.encode(PASSWORD), "Gestor",
            UserRole.GESTOR, false, true);
        fixtures.usuario(OPERATOR_EMAIL, passwordEncoder.encode(PASSWORD), "Operador",
            UserRole.OPERADOR, false, true);
    }

    @Test
    void managerCreatesPublicOneTimeInvitationAndOnlyHashIsPersisted() throws Exception {
        CreatedInvitation created = createInvitation(INVITED_EMAIL, "OPERADOR");

        assertThat(created.activationUrl()).startsWith("http://localhost:3000/convite?token=");
        assertThat(invitationRepository.findAll())
            .singleElement()
            .satisfies(invitation -> assertThat(invitation.getTokenHash()).doesNotContain(created.token()));

        mockMvc.perform(post("/api/auth/invitations/validate")
                .contentType(MediaType.APPLICATION_JSON)
                .content(tokenBody(created.token())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value(INVITED_EMAIL))
            .andExpect(jsonPath("$.perfil").value("OPERADOR"));

        mockMvc.perform(post("/api/auth/invitations/accept")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"token":"%s","nome":"Pessoa Convidada","senha":"%s"}
                    """.formatted(created.token(), PASSWORD)))
            .andExpect(status().isNoContent());

        User user = userRepository.findByEmailIgnoreCase(INVITED_EMAIL).orElseThrow();
        assertThat(user.getPerfil()).isEqualTo(UserRole.OPERADOR);
        assertThat(user.getTrocaSenhaObrigatoria()).isFalse();
        assertThat(passwordEncoder.matches(PASSWORD, user.getSenhaHash())).isTrue();

        mockMvc.perform(post("/api/auth/invitations/accept")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"token":"%s","nome":"Reuso","senha":"%s"}
                    """.formatted(created.token(), PASSWORD)))
            .andExpect(status().isGone())
            .andExpect(jsonPath("$.code").value("INVITATION_INVALID_OR_EXPIRED"));
    }

    @Test
    void generatingAnotherInvitationRevokesThePreviousToken() throws Exception {
        CreatedInvitation first = createInvitation(INVITED_EMAIL, "OPERADOR");
        CreatedInvitation second = createInvitation(INVITED_EMAIL, "GESTOR");

        mockMvc.perform(post("/api/auth/invitations/validate")
                .contentType(MediaType.APPLICATION_JSON)
                .content(tokenBody(first.token())))
            .andExpect(status().isGone());

        mockMvc.perform(post("/api/auth/invitations/validate")
                .contentType(MediaType.APPLICATION_JSON)
                .content(tokenBody(second.token())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.perfil").value("GESTOR"));
    }

    @Test
    void expiredInvitationIsRejectedWithoutCreatingUser() throws Exception {
        CreatedInvitation invitation = createInvitation(INVITED_EMAIL, "OPERADOR");
        jdbcTemplate.update("UPDATE convites_usuario SET expira_em = NOW() - INTERVAL '1 minute'");

        mockMvc.perform(post("/api/auth/invitations/validate")
                .contentType(MediaType.APPLICATION_JSON)
                .content(tokenBody(invitation.token())))
            .andExpect(status().isGone())
            .andExpect(jsonPath("$.code").value("INVITATION_INVALID_OR_EXPIRED"));

        assertThat(userRepository.existsByEmailIgnoreCase(INVITED_EMAIL)).isFalse();
    }

    @Test
    void weakPasswordDoesNotConsumeInvitation() throws Exception {
        CreatedInvitation invitation = createInvitation(INVITED_EMAIL, "OPERADOR");

        mockMvc.perform(post("/api/auth/invitations/accept")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"token":"%s","nome":"Pessoa","senha":"curta"}
                    """.formatted(invitation.token())))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.code").value("WEAK_PASSWORD"));

        mockMvc.perform(post("/api/auth/invitations/validate")
                .contentType(MediaType.APPLICATION_JSON)
                .content(tokenBody(invitation.token())))
            .andExpect(status().isOk());
    }

    @Test
    void operatorCannotCreateInvitations() throws Exception {
        mockMvc.perform(post("/api/auth/invitations")
                .header("Authorization", "Bearer " + tokenFor(OPERATOR_EMAIL))
                .contentType(MediaType.APPLICATION_JSON)
                .content(createBody(INVITED_EMAIL, "OPERADOR")))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
    }

    @Test
    void cannotInviteAnEmailThatAlreadyHasAnAccount() throws Exception {
        mockMvc.perform(post("/api/auth/invitations")
                .header("Authorization", "Bearer " + tokenFor(MANAGER_EMAIL))
                .contentType(MediaType.APPLICATION_JSON)
                .content(createBody(OPERATOR_EMAIL, "OPERADOR")))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("EMAIL_ALREADY_REGISTERED"));
    }

    @Test
    void concurrentAcceptanceCreatesOnlyOneAccount() throws Exception {
        CreatedInvitation invitation = createInvitation(INVITED_EMAIL, "OPERADOR");
        var request = new AcceptInvitationRequest(invitation.token(), "Pessoa Convidada", PASSWORD);
        CountDownLatch start = new CountDownLatch(1);

        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = executor.submit(() -> acceptAfter(start, request));
            var second = executor.submit(() -> acceptAfter(start, request));
            start.countDown();

            List<Throwable> results = Arrays.asList(
                first.get(20, TimeUnit.SECONDS),
                second.get(20, TimeUnit.SECONDS));
            assertThat(results).filteredOn(result -> result == null).hasSize(1);
            assertThat(results).filteredOn(InvalidInvitationException.class::isInstance).hasSize(1);
            assertThat(userRepository.findByEmailIgnoreCase(INVITED_EMAIL)).isPresent();
        }
    }

    private CreatedInvitation createInvitation(String email, String role) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/invitations")
                .header("Authorization", "Bearer " + tokenFor(MANAGER_EMAIL))
                .contentType(MediaType.APPLICATION_JSON)
                .content(createBody(email, role)))
            .andExpect(status().isCreated())
            .andReturn();

        JsonNode response = objectMapper.readTree(result.getResponse().getContentAsByteArray());
        String activationUrl = response.path("activationUrl").asText();
        String token = UriComponentsBuilder.fromUri(URI.create(activationUrl))
            .build()
            .getQueryParams()
            .getFirst("token");
        return new CreatedInvitation(activationUrl, token);
    }

    private String tokenFor(String email) {
        User user = userRepository.findByEmailIgnoreCaseAndAtivoTrue(email).orElseThrow();
        return jwtService.generate(user, jwtService.expiration());
    }

    private Throwable acceptAfter(CountDownLatch start, AcceptInvitationRequest request) {
        try {
            start.await();
            invitationService.accept(request);
            return null;
        } catch (Throwable exception) {
            return exception;
        }
    }

    private String createBody(String email, String role) {
        return """
            {"email":"%s","perfil":"%s"}
            """.formatted(email, role);
    }

    private String tokenBody(String token) {
        return """
            {"token":"%s"}
            """.formatted(token);
    }

    private record CreatedInvitation(String activationUrl, String token) {
    }
}
