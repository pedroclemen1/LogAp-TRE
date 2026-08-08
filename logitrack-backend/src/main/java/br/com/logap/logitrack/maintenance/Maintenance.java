package br.com.logap.logitrack.maintenance;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import br.com.logap.logitrack.shared.BusinessRuleException;
import br.com.logap.logitrack.vehicle.Vehicle;
import jakarta.persistence.CascadeType;
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
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;

/** Ordem de manutencao aplicada a um unico veiculo. */
@Entity
@Table(name = "manutencoes")
public class Maintenance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "veiculo_id", nullable = false)
    private Vehicle veiculo;

    @Column(name = "data_inicio_prevista", nullable = false)
    private LocalDate dataInicioPrevista;

    @Column(name = "data_finalizacao_prevista", nullable = false)
    private LocalDate dataFinalizacaoPrevista;

    @Column(name = "iniciada_em")
    private LocalDateTime iniciadaEm;

    @Column(name = "concluida_em")
    private LocalDateTime concluidaEm;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MaintenanceStatus status;

    @OneToMany(mappedBy = "manutencao", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private final List<MaintenanceItem> servicos = new ArrayList<>();

    protected Maintenance() {
    }

    public Maintenance(Vehicle veiculo, LocalDate dataInicioPrevista, LocalDate dataFinalizacaoPrevista) {
        this.veiculo = veiculo;
        this.dataInicioPrevista = dataInicioPrevista;
        this.dataFinalizacaoPrevista = dataFinalizacaoPrevista;
        this.status = MaintenanceStatus.PENDENTE;
    }

    public void atualizarPlanejamento(Vehicle veiculo, LocalDate inicio, LocalDate finalizacao) {
        this.veiculo = veiculo;
        this.dataInicioPrevista = inicio;
        this.dataFinalizacaoPrevista = finalizacao;
    }

    public void atualizarFinalizacaoPrevista(LocalDate finalizacao) {
        this.dataFinalizacaoPrevista = finalizacao;
    }

    public void substituirServicos(List<MaintenanceItem> novosServicos) {
        servicos.clear();
        novosServicos.forEach(this::adicionarServico);
    }

    public void adicionarServico(MaintenanceItem item) {
        item.vincular(this);
        servicos.add(item);
    }

    /*
     * Validar e aplicar separados pelo mesmo motivo descrito em `Trip`: o
     * servico precisa reservar o veiculo (lock + consulta) entre a checagem de
     * estado e a mutacao, sem inverter a precedencia das mensagens de erro.
     */

    public void validarPodeIniciar() {
        if (status != MaintenanceStatus.PENDENTE) {
            throw new BusinessRuleException("Somente uma manutencao pendente pode ser iniciada.");
        }
    }

    public void validarPodeAlterar() {
        if (status == MaintenanceStatus.CONCLUIDA) {
            throw new BusinessRuleException("Uma manutencao concluida nao pode ser alterada.");
        }
    }

    public void validarPodeExcluir() {
        if (status != MaintenanceStatus.PENDENTE) {
            throw new BusinessRuleException("Somente uma manutencao pendente pode ser excluida.");
        }
    }

    public void iniciar(LocalDateTime momento) {
        validarPodeIniciar();
        this.iniciadaEm = momento;
        this.status = MaintenanceStatus.EM_REALIZACAO;
    }

    public void concluir(LocalDateTime momento) {
        if (status != MaintenanceStatus.EM_REALIZACAO) {
            throw new BusinessRuleException("Somente uma manutencao em realizacao pode ser concluida.");
        }
        this.concluidaEm = momento;
        this.status = MaintenanceStatus.CONCLUIDA;
    }

    /**
     * Atraso e derivacao de dominio, nao de apresentacao: pendente vence quando
     * passa do inicio previsto; em realizacao, quando passa da finalizacao
     * prevista. Concluida nunca esta atrasada.
     *
     * Recebe "hoje" em vez de chamar `LocalDate.now()` — antes esta regra vivia
     * dentro de `MaintenanceResponse` e nao havia como testa-la sem mexer no
     * relogio da JVM.
     */
    public boolean estaAtrasada(LocalDate hoje) {
        return switch (status) {
            case PENDENTE -> dataInicioPrevista.isBefore(hoje);
            case EM_REALIZACAO -> dataFinalizacaoPrevista.isBefore(hoje);
            case CONCLUIDA -> false;
        };
    }

    public Integer getId() {
        return id;
    }

    public Vehicle getVeiculo() {
        return veiculo;
    }

    public LocalDate getDataInicioPrevista() {
        return dataInicioPrevista;
    }

    public LocalDate getDataFinalizacaoPrevista() {
        return dataFinalizacaoPrevista;
    }

    public LocalDateTime getIniciadaEm() {
        return iniciadaEm;
    }

    public LocalDateTime getConcluidaEm() {
        return concluidaEm;
    }

    public MaintenanceStatus getStatus() {
        return status;
    }

    public List<MaintenanceItem> getServicos() {
        return Collections.unmodifiableList(servicos);
    }
}

