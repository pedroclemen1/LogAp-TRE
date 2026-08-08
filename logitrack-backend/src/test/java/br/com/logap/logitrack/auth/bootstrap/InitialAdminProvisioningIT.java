package br.com.logap.logitrack.auth.bootstrap;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;

import br.com.logap.logitrack.auth.User;
import br.com.logap.logitrack.auth.UserRepository;
import br.com.logap.logitrack.auth.UserRole;
import br.com.logap.logitrack.auth.bootstrap.InitialAdminProvisioningService.ProvisioningResult;
import br.com.logap.logitrack.support.IntegrationTest;
import br.com.logap.logitrack.support.SqlFixtures;

class InitialAdminProvisioningIT extends IntegrationTest {

    private static final String EMAIL = "gestor@empresa.com";
    private static final String PASSWORD = "senha-inicial-forte";

    @Autowired
    private InitialAdminProvisioningService service;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private SqlFixtures fixtures;

    @BeforeEach
    void cleanDatabase() {
        databaseCleaner.clean();
    }

    @Test
    void createsManagerOnlyWhenDatabaseIsEmpty() {
        ProvisioningResult result = service.provision(enabledProperties());

        User manager = userRepository.findByEmailIgnoreCase(EMAIL).orElseThrow();
        assertThat(result).isEqualTo(ProvisioningResult.CREATED);
        assertThat(manager.getPerfil()).isEqualTo(UserRole.GESTOR);
        assertThat(manager.getAtivo()).isTrue();
        assertThat(manager.getTrocaSenhaObrigatoria()).isTrue();
        assertThat(passwordEncoder.matches(PASSWORD, manager.getSenhaHash())).isTrue();
        assertThat(manager.getSenhaHash()).doesNotContain(PASSWORD);
    }

    @Test
    void normalizesEmailAndName() {
        service.provision(new InitialAdminProperties(
            true, true, "  Gestor Inicial  ", "  GESTOR@EMPRESA.COM  ", PASSWORD));

        User manager = userRepository.findByEmailIgnoreCase(EMAIL).orElseThrow();
        assertThat(manager.getEmail()).isEqualTo(EMAIL);
        assertThat(manager.getNome()).isEqualTo("Gestor Inicial");
    }

    @Test
    void existingManagerMakesRepeatedExecutionANoOpEvenWithoutSecrets() {
        service.provision(enabledProperties());
        User before = userRepository.findByEmailIgnoreCase(EMAIL).orElseThrow();
        String passwordHash = before.getSenhaHash();

        ProvisioningResult result = service.provision(
            new InitialAdminProperties(true, true, null, null, null));

        User after = userRepository.findByEmailIgnoreCase(EMAIL).orElseThrow();
        assertThat(result).isEqualTo(ProvisioningResult.ALREADY_PROVISIONED);
        assertThat(userRepository.count()).isOne();
        assertThat(after.getSenhaHash()).isEqualTo(passwordHash);
    }

    @Test
    void inactiveManagerAlsoPreventsAutomaticPrivilegedAccountCreation() {
        fixtures.usuario(EMAIL, passwordEncoder.encode(PASSWORD), "Gestor",
            UserRole.GESTOR, false, false);

        ProvisioningResult result = service.provision(enabledProperties());

        assertThat(result).isEqualTo(ProvisioningResult.ALREADY_PROVISIONED);
        assertThat(userRepository.count()).isOne();
    }

    @Test
    void refusesPopulatedDatabaseWithoutManager() {
        fixtures.usuario("operador@empresa.com", passwordEncoder.encode(PASSWORD), "Operador");

        assertThatThrownBy(() -> service.provision(enabledProperties()))
            .isInstanceOf(InitialAdminProvisioningException.class)
            .hasMessageContaining("possui usuarios, mas nenhum gestor");
    }

    @Test
    void requiredBootstrapFailsFastWhenDatabaseIsEmptyAndItIsDisabled() {
        InitialAdminProperties disabled = new InitialAdminProperties(false, true, null, null, null);

        assertThatThrownBy(() -> service.provision(disabled))
            .isInstanceOf(InitialAdminProvisioningException.class)
            .hasMessageContaining("habilite o bootstrap");
    }

    @Test
    void optionalDisabledBootstrapDoesNothingInDevelopment() {
        InitialAdminProperties disabled = new InitialAdminProperties(false, false, null, null, null);

        assertThat(service.provision(disabled)).isEqualTo(ProvisioningResult.DISABLED);
        assertThat(userRepository.count()).isZero();
    }

    @Test
    void rejectsIncompleteOrWeakSecrets() {
        assertThatThrownBy(() -> service.provision(
            new InitialAdminProperties(true, true, "Gestor", "gestor@empresa.com", "curta")))
            .isInstanceOf(InitialAdminProvisioningException.class)
            .hasMessageContaining("ao menos 12 caracteres");
    }

    @Test
    void concurrentExecutionsCreateExactlyOneManager() throws Exception {
        CountDownLatch start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = executor.submit(() -> {
                start.await();
                return service.provision(enabledProperties());
            });
            var second = executor.submit(() -> {
                start.await();
                return service.provision(enabledProperties());
            });

            start.countDown();
            Set<ProvisioningResult> results = Set.of(
                first.get(20, TimeUnit.SECONDS),
                second.get(20, TimeUnit.SECONDS));

            assertThat(results).containsExactlyInAnyOrder(
                ProvisioningResult.CREATED, ProvisioningResult.ALREADY_PROVISIONED);
            assertThat(userRepository.count()).isOne();
        }
    }

    private InitialAdminProperties enabledProperties() {
        return new InitialAdminProperties(true, true, "Gestor Inicial", EMAIL, PASSWORD);
    }
}
