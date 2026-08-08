package br.com.logap.logitrack.vehicle;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "veiculos")
public class Vehicle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, unique = true, length = 10)
    private String placa;

    @Column(nullable = false, length = 50)
    private String modelo;

    /**
     * Coluna VARCHAR com CHECK (LEVE, PESADO). `EnumType.STRING` mantem o
     * banco legivel; `ORDINAL` gravaria 0/1 e quebraria a constraint.
     */
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private VehicleType tipo;

    private Integer ano;

    /**
     * Hodometro na entrada da frota (coluna adicionada na V3). O hodometro
     * ATUAL nao mora aqui: e `kmInicial + soma das viagens`, calculado na
     * consulta da tela de Frota. Ver a justificativa na propria migration.
     */
    @Column(name = "km_inicial", nullable = false, precision = 10, scale = 2)
    private BigDecimal kmInicial = BigDecimal.ZERO;

    protected Vehicle() {
        // Exigido pelo JPA.
    }

    public Vehicle(String placa, String modelo, VehicleType tipo, Integer ano, BigDecimal kmInicial) {
        atualizar(placa, modelo, tipo, ano, kmInicial);
    }

    /** Atualiza apenas os dados cadastrais; os indicadores operacionais continuam derivados. */
    public void atualizar(String placa, String modelo, VehicleType tipo, Integer ano, BigDecimal kmInicial) {
        this.placa = placa;
        this.modelo = modelo;
        this.tipo = tipo;
        this.ano = ano;
        this.kmInicial = kmInicial == null ? BigDecimal.ZERO : kmInicial;
    }

    public Integer getId() {
        return id;
    }

    public String getPlaca() {
        return placa;
    }

    public String getModelo() {
        return modelo;
    }

    public VehicleType getTipo() {
        return tipo;
    }

    public Integer getAno() {
        return ano;
    }

    public BigDecimal getKmInicial() {
        return kmInicial;
    }
}
