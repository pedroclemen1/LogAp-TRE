package br.com.logap.logitrack.auth.invitation;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class InvitationLock {

    private final JdbcTemplate jdbcTemplate;

    InvitationLock(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    void acquire(String normalizedEmail) {
        jdbcTemplate.query(
            "SELECT pg_advisory_xact_lock(?)",
            resultSet -> null,
            lockId(normalizedEmail));
    }

    private long lockId(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                .digest(value.getBytes(StandardCharsets.UTF_8));
            return ByteBuffer.wrap(digest).getLong();
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 indisponivel nesta JVM.", exception);
        }
    }
}
