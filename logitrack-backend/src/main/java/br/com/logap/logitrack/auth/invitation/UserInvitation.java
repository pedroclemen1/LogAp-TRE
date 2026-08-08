package br.com.logap.logitrack.auth.invitation;

import java.time.LocalDateTime;
import java.util.Objects;

import br.com.logap.logitrack.auth.User;
import br.com.logap.logitrack.auth.UserRole;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "convites_usuario")
public class UserInvitation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserRole perfil;

    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    @Column(name = "expira_em", nullable = false)
    private LocalDateTime expiraEm;

    @Column(name = "utilizado_em")
    private LocalDateTime utilizadoEm;

    @Column(name = "revogado_em")
    private LocalDateTime revogadoEm;

    @Column(name = "criado_em", nullable = false)
    private LocalDateTime criadoEm;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "criado_por", nullable = false)
    private User criadoPor;

    protected UserInvitation() {
    }

    private UserInvitation(String email, UserRole perfil, String tokenHash,
                           LocalDateTime expiraEm, LocalDateTime criadoEm, User criadoPor) {
        this.email = Objects.requireNonNull(email);
        this.perfil = Objects.requireNonNull(perfil);
        this.tokenHash = Objects.requireNonNull(tokenHash);
        this.expiraEm = Objects.requireNonNull(expiraEm);
        this.criadoEm = Objects.requireNonNull(criadoEm);
        this.criadoPor = Objects.requireNonNull(criadoPor);
    }

    public static UserInvitation create(String email, UserRole role, String tokenHash,
                                        LocalDateTime expiresAt, LocalDateTime createdAt, User createdBy) {
        return new UserInvitation(email, role, tokenHash, expiresAt, createdAt, createdBy);
    }

    public boolean isUsableAt(LocalDateTime now) {
        return utilizadoEm == null && revogadoEm == null && now.isBefore(expiraEm);
    }

    public void revoke(LocalDateTime revokedAt) {
        if (utilizadoEm == null && revogadoEm == null) {
            this.revogadoEm = Objects.requireNonNull(revokedAt);
        }
    }

    public void markUsed(LocalDateTime usedAt) {
        if (!isUsableAt(usedAt)) {
            throw new IllegalStateException("Convite indisponivel para utilizacao.");
        }
        this.utilizadoEm = Objects.requireNonNull(usedAt);
    }

    public String getEmail() {
        return email;
    }

    public UserRole getPerfil() {
        return perfil;
    }

    public String getTokenHash() {
        return tokenHash;
    }

    public LocalDateTime getExpiraEm() {
        return expiraEm;
    }

}
