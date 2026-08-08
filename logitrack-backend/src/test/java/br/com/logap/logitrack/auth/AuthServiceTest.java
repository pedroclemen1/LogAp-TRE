package br.com.logap.logitrack.auth;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import br.com.logap.logitrack.auth.dto.LoginRequest;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtService jwtService;
    @Mock
    private PasswordPolicy passwordPolicy;
    @Mock
    private LoginAttemptRateLimiter loginAttemptRateLimiter;

    private AuthService service;

    @BeforeEach
    void setUp() {
        when(passwordEncoder.encode(anyString())).thenReturn("dummy-password-hash");
        when(passwordPolicy.isWithinBcryptLimit(anyString())).thenReturn(true);
        service = new AuthService(
            userRepository,
            passwordEncoder,
            jwtService,
            passwordPolicy,
            loginAttemptRateLimiter);
    }

    @Test
    void usuarioInexistenteTambemExecutaVerificacaoDeSenha() {
        String email = "inexistente@empresa.com";
        String remoteAddress = "198.51.100.10";
        when(userRepository.findByEmailIgnoreCaseAndAtivoTrue(email)).thenReturn(Optional.empty());

        assertThrows(BadCredentialsException.class,
            () -> service.login(new LoginRequest(email, "senha-incorreta"), remoteAddress));

        verify(passwordEncoder).matches("senha-incorreta", "dummy-password-hash");
        verify(loginAttemptRateLimiter).recordFailure(email, remoteAddress);
    }
}
