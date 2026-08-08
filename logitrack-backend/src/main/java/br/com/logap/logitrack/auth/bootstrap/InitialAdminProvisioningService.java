package br.com.logap.logitrack.auth.bootstrap;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.logap.logitrack.auth.EmailNormalizer;
import br.com.logap.logitrack.auth.PasswordPolicy;
import br.com.logap.logitrack.auth.User;
import br.com.logap.logitrack.auth.UserRepository;
import br.com.logap.logitrack.auth.UserRole;

@Service
public class InitialAdminProvisioningService {

    private static final Logger LOGGER = LoggerFactory.getLogger(InitialAdminProvisioningService.class);
    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private final UserRepository userRepository;
    private final InitialAdminLock lock;
    private final PasswordEncoder passwordEncoder;
    private final PasswordPolicy passwordPolicy;
    private final Clock clock;

    public InitialAdminProvisioningService(UserRepository userRepository,
                                            InitialAdminLock lock,
                                            PasswordEncoder passwordEncoder,
                                            PasswordPolicy passwordPolicy,
                                            Clock clock) {
        this.userRepository = userRepository;
        this.lock = lock;
        this.passwordEncoder = passwordEncoder;
        this.passwordPolicy = passwordPolicy;
        this.clock = clock;
    }

    @Transactional
    public ProvisioningResult provision(InitialAdminProperties properties) {
        lock.acquire();

        if (userRepository.existsByPerfil(UserRole.GESTOR)) {
            return ProvisioningResult.ALREADY_PROVISIONED;
        }

        if (userRepository.count() > 0) {
            throw new InitialAdminProvisioningException(
                "Bootstrap recusado: o banco possui usuarios, mas nenhum gestor.");
        }

        if (!properties.enabled()) {
            if (properties.required()) {
                throw new InitialAdminProvisioningException(
                    "Banco vazio: habilite o bootstrap do gestor inicial para concluir o deploy.");
            }
            return ProvisioningResult.DISABLED;
        }

        ValidatedAdmin admin = validate(properties);
        User manager = User.initialManager(
            admin.email(),
            passwordEncoder.encode(admin.password()),
            admin.name(),
            LocalDateTime.now(clock));
        userRepository.saveAndFlush(manager);

        LOGGER.info("Gestor inicial provisionado para {}.", mask(admin.email()));
        return ProvisioningResult.CREATED;
    }

    private ValidatedAdmin validate(InitialAdminProperties properties) {
        String name = trim(properties.name());
        String email = EmailNormalizer.normalize(trim(properties.email()));
        String password = properties.password();

        if (name.isBlank()) {
            throw invalid("BOOTSTRAP_ADMIN_NAME deve ser informado.");
        }
        if (name.length() > 100) {
            throw invalid("BOOTSTRAP_ADMIN_NAME deve possuir no maximo 100 caracteres.");
        }
        if (!EMAIL.matcher(email).matches() || email.length() > 150) {
            throw invalid("BOOTSTRAP_ADMIN_EMAIL deve conter um e-mail valido.");
        }
        passwordPolicy.violation(password).ifPresent(violation -> {
            throw invalid("BOOTSTRAP_ADMIN_PASSWORD: " + violation);
        });

        return new ValidatedAdmin(name, email, password);
    }

    private InitialAdminProvisioningException invalid(String message) {
        return new InitialAdminProvisioningException("Configuracao invalida do bootstrap: " + message);
    }

    private static String trim(String value) {
        return value == null ? "" : value.strip();
    }

    private static String mask(String email) {
        int separator = email.indexOf('@');
        return email.charAt(0) + "***" + email.substring(separator);
    }

    private record ValidatedAdmin(String name, String email, String password) {
    }

    public enum ProvisioningResult {
        CREATED,
        ALREADY_PROVISIONED,
        DISABLED
    }
}
