package br.com.logap.logitrack.driver;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Tabela `motoristas`, adicionada em db/migration/V2__estrutura_complementar.sql. */
@Entity
@Table(name = "motoristas")
public class Driver {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, length = 100)
    private String nome;

    @Column(nullable = false, length = 20)
    private String cnh;

    @Column(length = 20)
    private String telefone;

    @Column(nullable = false)
    private Boolean ativo = true;

    protected Driver() {
    }

    public Driver(String nome, String cnh, String telefone) {
        this.nome = nome;
        this.cnh = cnh;
        this.telefone = telefone;
    }

    public void atualizar(String nome, String cnh, String telefone) {
        this.nome = nome;
        this.cnh = cnh;
        this.telefone = telefone;
    }

    public void desativar() {
        this.ativo = false;
    }

    public void reativar() {
        this.ativo = true;
    }

    public Integer getId() {
        return id;
    }

    public String getNome() {
        return nome;
    }

    public String getCnh() {
        return cnh;
    }

    public String getTelefone() {
        return telefone;
    }

    public Boolean getAtivo() {
        return ativo;
    }
}
