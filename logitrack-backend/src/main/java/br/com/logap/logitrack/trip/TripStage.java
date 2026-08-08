package br.com.logap.logitrack.trip;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import br.com.logap.logitrack.shared.BusinessRuleException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "viagem_etapas")
public class TripStage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "viagem_id", nullable = false)
    private Trip viagem;

    @Column(nullable = false)
    private Short ordem;

    @Column(nullable = false, length = 100)
    private String cidade;

    @Column(name = "previsto_em")
    private LocalDateTime previstoEm;

    @Column(name = "realizado_em")
    private LocalDateTime realizadoEm;

    @Column(name = "km_trecho", nullable = false, precision = 10, scale = 2)
    private BigDecimal kmTrecho;

    @Column(name = "carga_kg", nullable = false, precision = 10, scale = 2)
    private BigDecimal cargaKg;

    protected TripStage() {
    }

    public TripStage(Trip viagem, short ordem, String destino, BigDecimal kmTrecho,
                     BigDecimal cargaKg, LocalDateTime previstoEm, LocalDateTime realizadoEm) {
        this.viagem = viagem;
        this.ordem = ordem;
        this.cidade = destino;
        this.kmTrecho = kmTrecho;
        this.cargaKg = cargaKg;
        this.previstoEm = previstoEm;
        this.realizadoEm = realizadoEm;
    }

    public void prepararReordenacao(short ordemTemporaria) {
        this.ordem = ordemTemporaria;
    }

    /**
     * Atualiza o trecho.
     *
     * TRECHO CONCLUIDO E IMUTAVEL no que ja aconteceu: destino, quilometragem e
     * carga viram fato no momento em que a chegada e registrada. Mexer neles
     * reescreveria o passado — e reduzir `kmTrecho` faria o total da viagem
     * encolher, arrastando o hodometro do veiculo para tras junto.
     *
     * `ordem` continua ajustavel porque a reordenacao da rota usa posicoes
     * temporarias negativas para nao esbarrar em UNIQUE (viagem_id, ordem); e
     * mecanica de persistencia, nao mudanca de fato. `previstoEm` tambem passa:
     * previsao nao e o que aconteceu.
     */
    public void atualizarTrecho(short ordem, String destino, BigDecimal kmTrecho,
                                BigDecimal cargaKg, LocalDateTime previstoEm) {
        if (concluido() && alteraFatoConsumado(destino, kmTrecho, cargaKg)) {
            throw new BusinessRuleException(
                "O trecho %d ja foi concluido e nao pode ser alterado.".formatted(id));
        }
        this.ordem = ordem;
        this.cidade = destino;
        this.kmTrecho = kmTrecho;
        this.cargaKg = cargaKg;
        this.previstoEm = previstoEm;
    }

    /** `compareTo` e nao `equals`: 600 e 600.00 sao o mesmo valor em BigDecimal. */
    private boolean alteraFatoConsumado(String destino, BigDecimal kmTrecho, BigDecimal cargaKg) {
        return !this.cidade.equals(destino)
            || this.kmTrecho.compareTo(kmTrecho) != 0
            || this.cargaKg.compareTo(cargaKg) != 0;
    }

    public boolean concluido() {
        return realizadoEm != null;
    }

    /**
     * Carimba a chegada real neste ponto da rota.
     *
     * A guarda mora aqui porque olha so o estado do proprio trecho. Quem
     * verifica a ORDEM (se este e mesmo o proximo pendente) e o servico, que
     * precisa enxergar a rota inteira.
     */
    public void registrarRealizacao(LocalDateTime realizadoEm) {
        if (this.realizadoEm != null) {
            throw new BusinessRuleException("Este trecho ja foi concluido.");
        }
        this.realizadoEm = realizadoEm;
    }

    public Integer getId() {
        return id;
    }

    /** Necessario ao romaneio: o trecho 1 herda a origem da viagem. */
    public Trip getViagem() {
        return viagem;
    }

    public Short getOrdem() {
        return ordem;
    }

    public String getCidade() {
        return cidade;
    }

    public LocalDateTime getPrevistoEm() {
        return previstoEm;
    }

    public LocalDateTime getRealizadoEm() {
        return realizadoEm;
    }

    public BigDecimal getKmTrecho() {
        return kmTrecho;
    }

    public BigDecimal getCargaKg() {
        return cargaKg;
    }
}
