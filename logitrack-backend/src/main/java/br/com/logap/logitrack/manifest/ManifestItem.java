package br.com.logap.logitrack.manifest;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/** Uma linha da tabela "Itens da Carga" do romaneio: uma nota fiscal embarcada. */
@Entity
@Table(name = "romaneio_itens")
public class ManifestItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "romaneio_id", nullable = false)
    private Manifest romaneio;

    /** Coluna "Seq." impressa; atribuida pelo romaneio, nunca pelo cliente. */
    @Column(nullable = false)
    private Short sequencia;

    @Column(name = "nota_fiscal", nullable = false, length = 30)
    private String notaFiscal;

    @Column(nullable = false, length = 150)
    private String destinatario;

    @Column(nullable = false)
    private Integer volumes;

    @Column(name = "peso_kg", nullable = false, precision = 10, scale = 2)
    private BigDecimal pesoKg;

    protected ManifestItem() {
    }

    public ManifestItem(String notaFiscal, String destinatario, Integer volumes, BigDecimal pesoKg) {
        this.notaFiscal = notaFiscal;
        this.destinatario = destinatario;
        this.volumes = volumes;
        this.pesoKg = pesoKg;
    }

    void vincular(Manifest romaneio, short sequencia) {
        this.romaneio = romaneio;
        this.sequencia = sequencia;
    }

    public Integer getId() {
        return id;
    }

    public Short getSequencia() {
        return sequencia;
    }

    public String getNotaFiscal() {
        return notaFiscal;
    }

    public String getDestinatario() {
        return destinatario;
    }

    public Integer getVolumes() {
        return volumes;
    }

    public BigDecimal getPesoKg() {
        return pesoKg;
    }
}
