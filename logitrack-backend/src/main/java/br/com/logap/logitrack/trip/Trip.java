package br.com.logap.logitrack.trip;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import br.com.logap.logitrack.driver.Driver;
import br.com.logap.logitrack.shared.BusinessRuleException;
import br.com.logap.logitrack.vehicle.Vehicle;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * Resumo da viagem. A rota detalhada vive em `viagem_etapas`; destino,
 * quilometragem, carga inicial e chegada prevista sao derivados dos trechos.
 */
@Entity
@Table(name = "viagens")
public class Trip {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    /** LAZY: a listagem monta o DTO com JOIN FETCH explicito, evitando N+1. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "veiculo_id", nullable = false)
    private Vehicle veiculo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "motorista_id")
    private Driver motorista;

    @Column(name = "data_saida", nullable = false)
    private LocalDateTime dataSaida;

    @Column(name = "iniciada_em")
    private LocalDateTime iniciadaEm;

    @Column(name = "data_chegada")
    private LocalDateTime dataChegada;

    @Column(name = "data_chegada_prevista")
    private LocalDateTime dataChegadaPrevista;

    @Column(length = 100)
    private String origem;

    @Column(length = 100)
    private String destino;

    @Column(name = "km_percorrida", precision = 10, scale = 2)
    private BigDecimal kmPercorrida;

    @Column(name = "carga_kg", precision = 10, scale = 2)
    private BigDecimal cargaKg;

    /** Fato humano de cancelamento; os demais status continuam derivados das datas. */
    @Column(name = "cancelada_em")
    private LocalDateTime canceladaEm;

    protected Trip() {
    }

    public Trip(Vehicle veiculo, Driver motorista, LocalDateTime dataSaida, LocalDateTime dataChegadaPrevista,
                String origem, String destino, BigDecimal kmPercorrida, BigDecimal cargaKg) {
        this.veiculo = veiculo;
        this.motorista = motorista;
        this.dataSaida = dataSaida;
        this.dataChegadaPrevista = dataChegadaPrevista;
        this.origem = origem;
        this.destino = destino;
        this.kmPercorrida = kmPercorrida;
        this.cargaKg = cargaKg;
    }

    public void atualizar(Vehicle veiculo, Driver motorista, LocalDateTime dataSaida, LocalDateTime dataChegadaPrevista,
                          String origem, String destino, BigDecimal kmPercorrida, BigDecimal cargaKg) {
        validarPodeAlterar();
        this.veiculo = veiculo;
        this.motorista = motorista;
        this.dataSaida = dataSaida;
        this.dataChegadaPrevista = dataChegadaPrevista;
        this.origem = origem;
        this.destino = destino;
        this.kmPercorrida = kmPercorrida;
        this.cargaKg = cargaKg;
    }

    public TripStatus getStatus() {
        return TripStatus.of(iniciadaEm, dataChegada, canceladaEm);
    }

    /*
     * VALIDAR E APLICAR SAO SEPARADOS DE PROPOSITO.
     *
     * As guardas abaixo olham so o estado da propria viagem, entao pertencem a
     * entidade. Mas `start`/`update` do servico precisam tomar o lock
     * pessimista do veiculo ANTES de mutar, e as checagens de alocacao
     * (veiculo/motorista ja ocupados) dependem de consulta.
     *
     * Se o servico so chamasse `iniciar()`, o erro de alocacao apareceria antes
     * do erro de estado — hoje e o contrario, e o de estado e mais especifico
     * para quem esta na tela. Por isso o servico chama `validarPodeIniciar()`
     * na mesma posicao em que as guardas ficavam, e `iniciar()` revalida ao
     * mutar. A revalidacao e barata e garante que a entidade nunca aceite uma
     * transicao invalida, mesmo se um chamador futuro esquecer o passo 1.
     */

    public void validarPodeIniciar() {
        garantirNaoCancelada();
        if (getStatus() == TripStatus.CONCLUIDA) {
            throw new BusinessRuleException("Uma viagem concluida nao pode ser iniciada.");
        }
        if (getStatus() == TripStatus.EM_ANDAMENTO) {
            throw new BusinessRuleException("A viagem ja esta em andamento.");
        }
        if (motorista == null) {
            throw new BusinessRuleException("Atribua um motorista antes de iniciar a viagem.");
        }
        if (!motorista.getAtivo()) {
            throw new BusinessRuleException("O motorista atribuido esta inativo.");
        }
    }

    public void validarPodeAlterar() {
        garantirNaoCancelada();
        if (getStatus() == TripStatus.CONCLUIDA) {
            throw new BusinessRuleException("Uma viagem concluida nao pode ser alterada.");
        }
    }

    public void iniciar(LocalDateTime inicio) {
        validarPodeIniciar();
        this.iniciadaEm = inicio;
    }

    public void concluir(LocalDateTime chegada) {
        garantirNaoCancelada();
        if (getStatus() == TripStatus.CONCLUIDA) {
            throw new BusinessRuleException("A viagem ja esta concluida.");
        }
        if (getStatus() != TripStatus.EM_ANDAMENTO) {
            throw new BusinessRuleException("Inicie a viagem antes de conclui-la.");
        }
        this.dataChegada = chegada;
    }

    public void cancelar(LocalDateTime canceladaEm) {
        if (this.canceladaEm != null) {
            throw new BusinessRuleException("A viagem ja esta cancelada.");
        }
        if (getStatus() == TripStatus.CONCLUIDA) {
            throw new BusinessRuleException("Uma viagem concluida nao pode ser cancelada.");
        }
        this.canceladaEm = canceladaEm;
    }

    private void garantirNaoCancelada() {
        if (canceladaEm != null) {
            throw new BusinessRuleException("Uma viagem cancelada nao pode ser alterada.");
        }
    }

    public Integer getId() {
        return id;
    }

    public Vehicle getVeiculo() {
        return veiculo;
    }

    public Driver getMotorista() {
        return motorista;
    }

    public LocalDateTime getDataSaida() {
        return dataSaida;
    }

    public LocalDateTime getIniciadaEm() {
        return iniciadaEm;
    }

    public LocalDateTime getDataChegada() {
        return dataChegada;
    }

    public LocalDateTime getDataChegadaPrevista() {
        return dataChegadaPrevista;
    }

    public String getOrigem() {
        return origem;
    }

    public String getDestino() {
        return destino;
    }

    public BigDecimal getKmPercorrida() {
        return kmPercorrida;
    }

    public BigDecimal getCargaKg() {
        return cargaKg;
    }

    public LocalDateTime getCanceladaEm() {
        return canceladaEm;
    }
}
