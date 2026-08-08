package br.com.logap.logitrack.auth;

import java.time.LocalDateTime;
import java.util.Objects;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Tabela `usuarios`, adicionada em db/migration/V2__estrutura_complementar.sql. */
@Entity
@Table(name = "usuarios")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    /** Hash BCrypt. Nunca sai da aplicacao: nenhum DTO expoe este campo. */
    @Column(name = "senha_hash", nullable = false, length = 72)
    private String senhaHash;

    @Column(nullable = false, length = 100)
    private String nome;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserRole perfil;

    @Column(nullable = false)
    private Boolean ativo;

    @Column(name = "criado_em", nullable = false)
    private LocalDateTime criadoEm;

    @Column(name = "troca_senha_obrigatoria", nullable = false)
    private Boolean trocaSenhaObrigatoria;

    @Column(name = "versao_credenciais", nullable = false)
    private int credentialVersion;

    protected User() {
    }

    private User(String email, String senhaHash, String nome, UserRole perfil,
                 boolean trocaSenhaObrigatoria, LocalDateTime criadoEm) {
        this.email = Objects.requireNonNull(email);
        this.senhaHash = Objects.requireNonNull(senhaHash);
        this.nome = Objects.requireNonNull(nome);
        this.perfil = Objects.requireNonNull(perfil);
        this.ativo = true;
        this.trocaSenhaObrigatoria = trocaSenhaObrigatoria;
        this.credentialVersion = 0;
        this.criadoEm = Objects.requireNonNull(criadoEm);
    }

    public static User initialManager(String email, String senhaHash, String nome, LocalDateTime criadoEm) {
        return new User(email, senhaHash, nome, UserRole.GESTOR, true, criadoEm);
    }

    public static User invited(String email, String senhaHash, String nome, UserRole perfil,
                               LocalDateTime criadoEm) {
        return new User(email, senhaHash, nome, perfil, false, criadoEm);
    }

    public void changePassword(String senhaHash) {
        this.senhaHash = Objects.requireNonNull(senhaHash);
        this.trocaSenhaObrigatoria = false;
        this.credentialVersion++;
    }

    public Integer getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public String getSenhaHash() {
        return senhaHash;
    }

    public String getNome() {
        return nome;
    }

    public UserRole getPerfil() {
        return perfil;
    }

    public Boolean getAtivo() {
        return ativo;
    }

    public Boolean getTrocaSenhaObrigatoria() {
        return trocaSenhaObrigatoria;
    }

    public int getCredentialVersion() {
        return credentialVersion;
    }
}
