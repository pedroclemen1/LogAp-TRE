package br.com.logap.logitrack.auth.bootstrap;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class InitialAdminLock {

    private static final long LOCK_ID = 4_982_731_104L;

    private final JdbcTemplate jdbcTemplate;

    InitialAdminLock(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    void acquire() {
        jdbcTemplate.query("SELECT pg_advisory_xact_lock(?)", resultSet -> null, LOCK_ID);
    }
}
