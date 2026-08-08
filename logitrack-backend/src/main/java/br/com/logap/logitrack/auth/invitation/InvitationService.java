package br.com.logap.logitrack.auth.invitation;

import java.time.Clock;
import java.time.LocalDateTime;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

import br.com.logap.logitrack.auth.EmailNormalizer;
import br.com.logap.logitrack.auth.PasswordPolicy;
import br.com.logap.logitrack.auth.User;
import br.com.logap.logitrack.auth.UserRepository;
import br.com.logap.logitrack.auth.invitation.InvitationDeliveryPort.InvitationDelivery;
import br.com.logap.logitrack.auth.invitation.dto.AcceptInvitationRequest;
import br.com.logap.logitrack.auth.invitation.dto.CreateInvitationRequest;
import br.com.logap.logitrack.auth.invitation.dto.CreateInvitationResponse;
import br.com.logap.logitrack.auth.invitation.dto.InvitationDetailsResponse;
import br.com.logap.logitrack.shared.BusinessRuleException;
import br.com.logap.logitrack.shared.ConflictException;

@Service
public class InvitationService {

    private final UserInvitationRepository invitationRepository;
    private final UserRepository userRepository;
    private final InvitationTokenService tokenService;
    private final InvitationLock invitationLock;
    private final InvitationDeliveryDispatcher deliveryDispatcher;
    private final InvitationProperties properties;
    private final PasswordPolicy passwordPolicy;
    private final PasswordEncoder passwordEncoder;
    private final Clock clock;

    public InvitationService(UserInvitationRepository invitationRepository,
                             UserRepository userRepository,
                             InvitationTokenService tokenService,
                             InvitationLock invitationLock,
                             InvitationDeliveryDispatcher deliveryDispatcher,
                             InvitationProperties properties,
                             PasswordPolicy passwordPolicy,
                             PasswordEncoder passwordEncoder,
                             Clock clock) {
        this.invitationRepository = invitationRepository;
        this.userRepository = userRepository;
        this.tokenService = tokenService;
        this.invitationLock = invitationLock;
        this.deliveryDispatcher = deliveryDispatcher;
        this.properties = properties;
        this.passwordPolicy = passwordPolicy;
        this.passwordEncoder = passwordEncoder;
        this.clock = clock;
    }

    @Transactional
    public CreateInvitationResponse create(String creatorEmail, CreateInvitationRequest request) {
        String email = EmailNormalizer.normalize(request.email());
        invitationLock.acquire(email);
        ensureEmailIsAvailable(email);

        User creator = userRepository.findByEmailIgnoreCaseAndAtivoTrue(creatorEmail)
            .orElseThrow(InvalidInvitationException::new);
        LocalDateTime now = LocalDateTime.now(clock);

        invitationRepository.findPendingByEmailForUpdate(email)
            .forEach(invitation -> invitation.revoke(now));
        invitationRepository.flush();

        String rawToken = tokenService.generate();
        LocalDateTime expiresAt = now.plusHours(properties.expirationHours());
        UserInvitation invitation = UserInvitation.create(
            email,
            request.perfil(),
            tokenService.hash(rawToken),
            expiresAt,
            now,
            creator);
        invitationRepository.saveAndFlush(invitation);

        String activationUrl = UriComponentsBuilder.fromUri(properties.baseUrl())
            .queryParam("token", rawToken)
            .build()
            .encode()
            .toUriString();
        deliveryDispatcher.schedule(new InvitationDelivery(email, activationUrl));

        return new CreateInvitationResponse(
            email,
            request.perfil(),
            expiresAt.atZone(clock.getZone()).toOffsetDateTime(),
            activationUrl);
    }

    @Transactional(readOnly = true)
    public InvitationDetailsResponse validate(String rawToken) {
        UserInvitation invitation = invitationRepository.findByTokenHash(tokenService.hash(rawToken))
            .filter(candidate -> candidate.isUsableAt(LocalDateTime.now(clock)))
            .orElseThrow(InvalidInvitationException::new);

        return new InvitationDetailsResponse(
            invitation.getEmail(),
            invitation.getPerfil(),
            invitation.getExpiraEm().atZone(clock.getZone()).toOffsetDateTime());
    }

    @Transactional
    public void accept(AcceptInvitationRequest request) {
        LocalDateTime now = LocalDateTime.now(clock);
        String tokenHash = tokenService.hash(request.token());
        String invitationEmail = invitationRepository.findEmailByTokenHash(tokenHash)
            .orElseThrow(InvalidInvitationException::new);
        invitationLock.acquire(invitationEmail);

        UserInvitation invitation = invitationRepository
            .findByTokenHashForUpdate(tokenHash)
            .filter(lockedInvitation -> lockedInvitation.isUsableAt(now))
            .orElseThrow(InvalidInvitationException::new);

        ensureEmailIsAvailable(invitation.getEmail());
        passwordPolicy.violation(request.senha()).ifPresent(violation -> {
            throw new BusinessRuleException("WEAK_PASSWORD", violation);
        });

        User user = User.invited(
            invitation.getEmail(),
            passwordEncoder.encode(request.senha()),
            request.nome().strip(),
            invitation.getPerfil(),
            now);
        userRepository.save(user);
        invitation.markUsed(now);
        invitationRepository.saveAndFlush(invitation);
    }

    private void ensureEmailIsAvailable(String email) {
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ConflictException(
                "EMAIL_ALREADY_REGISTERED",
                "Ja existe um usuario cadastrado com este e-mail.");
        }
    }

}
