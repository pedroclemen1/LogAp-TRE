package br.com.logap.logitrack.support;

import java.sql.Connection;
import java.sql.DriverManager;
import java.time.Duration;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

import com.github.dockerjava.api.model.ContainerNetwork;

/**
 * Compartilha um PostgreSQL 16 real entre os testes integrados. As consultas
 * usam recursos e índices que um banco em memória não reproduziria.
 */
@SpringBootTest
@ActiveProfiles("test")
public abstract class IntegrationTest {

    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(30);

    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

    private static final String JDBC_URL;

    static {
        POSTGRES.start();
        JDBC_URL = resolveReachableJdbcUrl();
    }

    @Autowired
    protected DatabaseCleaner databaseCleaner;

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> JDBC_URL);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    /** Usa a porta publicada no host ou, no Maven conteinerizado, o IP interno. */
    private static String resolveReachableJdbcUrl() {
        String published = POSTGRES.getJdbcUrl();
        if (awaitReachable(published)) {
            return published;
        }

        String internal = internalJdbcUrl();
        if (internal != null && awaitReachable(internal)) {
            return internal;
        }

        throw new IllegalStateException(
            "Banco de teste inacessivel. Tentado: " + published + " e " + internal);
    }

    private static String internalJdbcUrl() {
        var networks = POSTGRES.getContainerInfo().getNetworkSettings().getNetworks();
        return networks.values().stream()
            .map(ContainerNetwork::getIpAddress)
            .filter(ip -> ip != null && !ip.isBlank())
            .findFirst()
            .map(ip -> "jdbc:postgresql://%s:5432/%s".formatted(ip, POSTGRES.getDatabaseName()))
            .orElse(null);
    }

    private static boolean awaitReachable(String jdbcUrl) {
        long deadline = System.nanoTime() + CONNECT_TIMEOUT.toNanos();
        while (System.nanoTime() < deadline) {
            try (Connection ignored = DriverManager.getConnection(
                    jdbcUrl, POSTGRES.getUsername(), POSTGRES.getPassword())) {
                return true;
            } catch (Exception exception) {
                try {
                    Thread.sleep(250);
                } catch (InterruptedException interrupted) {
                    Thread.currentThread().interrupt();
                    return false;
                }
            }
        }
        return false;
    }
}
