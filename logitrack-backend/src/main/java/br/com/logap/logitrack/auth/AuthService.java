package br.com.logap.logitrack.auth;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.logap.logitrack.auth.dto.LoginRequest;
import br.com.logap.logitrack.auth.dto.LoginResponse;
import br.com.logap.logitrack.auth.dto.PasswordChangeRequest;
import br.com.logap.logitrack.shared.BusinessRuleException;
import br.com.logap.logitrack.shared.ResourceNotFoundException;

@Service
@Transactional(readOnly = true)
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final PasswordPolicy passwordPolicy;
    private final LoginAttemptRateLimiter loginAttemptRateLimiter;
    private final String dummyPasswordHash;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder,
                       JwtService jwtService, PasswordPolicy passwordPolicy,
                       LoginAttemptRateLimiter loginAttemptRateLimiter) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.passwordPolicy = passwordPolicy;
        this.loginAttemptRateLimiter = loginAttemptRateLimiter;
        this.dummyPasswordHash = passwordEncoder.encode(UUID.randomUUID().toString());
    }

    public LoginResponse login(LoginRequest request, String clientIdentity) {
        loginAttemptRateLimiter.checkAllowed(request.email(), clientIdentity);

        // Mensagem unica para usuario inexistente e senha errada: distinguir
        // permitiria enumerar e-mails cadastrados.
        User user = userRepository.findByEmailIgnoreCaseAndAtivoTrue(request.email())
            .orElse(null);
        String passwordHash = user == null ? dummyPasswordHash : user.getSenhaHash();
        boolean passwordWithinLimit = passwordPolicy.isWithinBcryptLimit(request.senha());
        String passwordCandidate = passwordWithinLimit ? request.senha() : "invalid-over-bcrypt-limit";
        boolean passwordMatches = passwordEncoder.matches(passwordCandidate, passwordHash);

        if (user == null || !passwordWithinLimit || !passwordMatches) {
            loginAttemptRateLimiter.recordFailure(request.email(), clientIdentity);
            throw new BadCredentialsException("Credenciais invalidas.");
        }

        LoginResponse response = issueToken(user);
        loginAttemptRateLimiter.recordSuccess(request.email(), clientIdentity);
        return response;
    }

    @Transactional
    public LoginResponse changePassword(String email, PasswordChangeRequest request) {
        User user = userRepository.findActiveByEmailForUpdate(email)
            .orElseThrow(() -> new ResourceNotFoundException("AUTHENTICATED_USER_NOT_FOUND", "Usuario", email));

        if (!passwordPolicy.isWithinBcryptLimit(request.senhaAtual())
            || !passwordEncoder.matches(request.senhaAtual(), user.getSenhaHash())) {
            throw new BusinessRuleException("INVALID_CURRENT_PASSWORD", "Senha atual invalida.");
        }
        passwordPolicy.violation(request.novaSenha()).ifPresent(violation -> {
            throw new BusinessRuleException("WEAK_PASSWORD", violation);
        });
        if (passwordEncoder.matches(request.novaSenha(), user.getSenhaHash())) {
            throw new BusinessRuleException("PASSWORD_REUSE", "A nova senha deve ser diferente da atual.");
        }

        user.changePassword(passwordEncoder.encode(request.novaSenha()));
        return issueToken(user);
    }

    private LoginResponse issueToken(User user) {
        Instant expiresAt = jwtService.expiration();
        return new LoginResponse(
            jwtService.generate(user, expiresAt),
            OffsetDateTime.ofInstant(expiresAt, ZoneOffset.UTC),
            user.getNome(),
            user.getEmail(),
            user.getPerfil(),
            user.getTrocaSenhaObrigatoria());
    }
}
