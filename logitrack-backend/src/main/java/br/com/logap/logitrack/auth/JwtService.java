package br.com.logap.logitrack.auth;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;

import javax.crypto.SecretKey;

import org.springframework.stereotype.Service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

/** Emissao e leitura do JWT. HS256 exige chave de no minimo 32 bytes. */
@Service
public class JwtService {

    private static final String CREDENTIAL_VERSION_CLAIM = "credentialVersion";

    private final SecretKey key;
    private final long expirationMinutes;
    private final Clock clock;

    public JwtService(JwtProperties properties, Clock clock) {
        this.key = Keys.hmacShaKeyFor(properties.secret().getBytes(StandardCharsets.UTF_8));
        this.expirationMinutes = properties.expirationMinutes();
        this.clock = clock;
    }

    public Instant expiration() {
        return Instant.now(clock).plus(expirationMinutes, ChronoUnit.MINUTES);
    }

    public String generate(User user, Instant expiresAt) {
        return Jwts.builder()
            .subject(user.getEmail())
            .claim("nome", user.getNome())
            .claim("perfil", user.getPerfil().name())
            .claim(CREDENTIAL_VERSION_CLAIM, user.getCredentialVersion())
            .issuedAt(Date.from(Instant.now(clock)))
            .expiration(Date.from(expiresAt))
            .signWith(key, Jwts.SIG.HS256)
            .compact();
    }

    public JwtIdentity extractIdentity(String token) {
        try {
            Claims claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
            Object versionClaim = claims.get(CREDENTIAL_VERSION_CLAIM);
            if (claims.getSubject() == null || !(versionClaim instanceof Number version)) {
                return null;
            }
            return new JwtIdentity(claims.getSubject(), version.intValue());
        } catch (JwtException | IllegalArgumentException ex) {
            return null;
        }
    }

    public record JwtIdentity(String email, int credentialVersion) {
    }
}
