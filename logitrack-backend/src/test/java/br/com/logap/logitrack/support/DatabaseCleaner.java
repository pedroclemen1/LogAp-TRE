package br.com.logap.logitrack.support;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Zera as tabelas de dominio entre testes.
 *
 * Cada teste cria o proprio cenario. `RESTART IDENTITY` mantem ids previsiveis
 * e `CASCADE` evita acoplar a limpeza a ordem das chaves estrangeiras.
 */
@Component
public class DatabaseCleaner {

    private static final String[] TABLES = {
        "convites_usuario",
        "viagem_eventos",
        "viagem_etapas",
        "viagens",
        "manutencao_servicos",
        "manutencoes",
        "servicos_manutencao",
        "motoristas",
        "veiculos",
        "usuarios",
    };

    private final JdbcTemplate jdbcTemplate;

    public DatabaseCleaner(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public void clean() {
        jdbcTemplate.execute("TRUNCATE TABLE " + String.join(", ", TABLES) + " RESTART IDENTITY CASCADE");
    }
}
