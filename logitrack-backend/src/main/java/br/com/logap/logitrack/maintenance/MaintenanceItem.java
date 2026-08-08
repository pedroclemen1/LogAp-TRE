package br.com.logap.logitrack.maintenance;

import java.math.BigDecimal;

import br.com.logap.logitrack.maintenance.catalog.MaintenanceServiceType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/** Linha de servico da ordem; nome e custo ficam congelados no historico. */
@Entity
@Table(name = "manutencao_servicos")
public class MaintenanceItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "manutencao_id", nullable = false)
    private Maintenance manutencao;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "servico_manutencao_id", nullable = false)
    private MaintenanceServiceType servicoCatalogo;

    @Column(name = "nome_servico", nullable = false, length = 100)
    private String nomeServico;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal custo;

    protected MaintenanceItem() {
    }

    public MaintenanceItem(MaintenanceServiceType servicoCatalogo, BigDecimal custo) {
        this.servicoCatalogo = servicoCatalogo;
        this.nomeServico = servicoCatalogo.getNome();
        this.custo = custo;
    }

    void vincular(Maintenance maintenance) {
        this.manutencao = maintenance;
    }

    public void atualizarCusto(BigDecimal custo) {
        this.custo = custo;
    }

    public Integer getId() {
        return id;
    }

    public MaintenanceServiceType getServicoCatalogo() {
        return servicoCatalogo;
    }

    public String getNomeServico() {
        return nomeServico;
    }

    public BigDecimal getCusto() {
        return custo;
    }
}
