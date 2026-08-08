package br.com.logap.logitrack.manifest;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import br.com.logap.logitrack.trip.Trip;
import br.com.logap.logitrack.trip.TripStage;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;

/**
 * Romaneio de carga: o documento que viaja junto com a mercadoria.
 *
 * UM POR TRECHO. A carga muda a cada ponto da rota, entao cada perna tem o seu
 * documento — origem, destino, distancia e notas fiscais proprios.
 *
 * TUDO AQUI E SNAPSHOT. Placa, motorista, cidades e distancia sao COPIADOS no
 * momento da emissao, nao lidos por relacionamento. Um romaneio ja impresso e
 * assinado nao pode mudar porque alguem corrigiu o cadastro do veiculo ou
 * reordenou a rota depois — o papel na mao do motorista deixaria de bater com o
 * sistema.
 *
 * Trecho e viagem ficam referenciados apenas para rastreabilidade.
 */
@Entity
@Table(name = "romaneios")
public class Manifest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    /** O trecho coberto por este documento. UNIQUE no banco: um romaneio por trecho. */
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "viagem_etapa_id", nullable = false, unique = true)
    private TripStage viagemEtapa;

    /** Redundante em relacao ao trecho, mas evita JOIN para agrupar por viagem na tela. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "viagem_id", nullable = false)
    private Trip viagem;

    /** Numero do trecho impresso; snapshot, para reordenar a rota nao renumerar o documento. */
    @Column(name = "trecho_ordem", nullable = false)
    private Short trechoOrdem;

    @Column(nullable = false, unique = true, length = 20)
    private String numero;

    @Column(name = "emitido_em", nullable = false)
    private LocalDateTime emitidoEm;

    @Column(name = "emitido_por", nullable = false, length = 100)
    private String emitidoPor;

    @Column(nullable = false, length = 16)
    private String autenticacao;

    @Column(name = "transportadora_razao_social", nullable = false, length = 150)
    private String transportadoraRazaoSocial;

    @Column(name = "transportadora_cnpj", nullable = false, length = 18)
    private String transportadoraCnpj;

    @Column(name = "transportadora_antt", length = 20)
    private String transportadoraAntt;

    @Column(name = "motorista_nome", nullable = false, length = 100)
    private String motoristaNome;

    @Column(name = "motorista_cnh", length = 20)
    private String motoristaCnh;

    @Column(name = "veiculo_placa", nullable = false, length = 10)
    private String veiculoPlaca;

    @Column(name = "veiculo_descricao", nullable = false, length = 100)
    private String veiculoDescricao;

    @Column(name = "origem_nome", nullable = false, length = 100)
    private String origemNome;

    @Column(name = "origem_endereco", length = 200)
    private String origemEndereco;

    @Column(name = "destino_nome", nullable = false, length = 100)
    private String destinoNome;

    @Column(name = "destino_endereco", length = 200)
    private String destinoEndereco;

    @Column(name = "distancia_km", nullable = false, precision = 10, scale = 2)
    private BigDecimal distanciaKm;

    @OneToMany(mappedBy = "romaneio", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sequencia ASC")
    private final List<ManifestItem> itens = new ArrayList<>();

    protected Manifest() {
    }

    public Manifest(TripStage viagemEtapa, Trip viagem, Short trechoOrdem,
                    String numero, LocalDateTime emitidoEm, String emitidoPor) {
        this.viagemEtapa = viagemEtapa;
        this.viagem = viagem;
        this.trechoOrdem = trechoOrdem;
        this.numero = numero;
        this.emitidoEm = emitidoEm;
        this.emitidoPor = emitidoPor;
    }

    public void definirTransportadora(String razaoSocial, String cnpj, String antt) {
        this.transportadoraRazaoSocial = razaoSocial;
        this.transportadoraCnpj = cnpj;
        this.transportadoraAntt = antt;
    }

    public void definirVeiculoEMotorista(String motoristaNome, String motoristaCnh,
                                         String veiculoPlaca, String veiculoDescricao) {
        this.motoristaNome = motoristaNome;
        this.motoristaCnh = motoristaCnh;
        this.veiculoPlaca = veiculoPlaca;
        this.veiculoDescricao = veiculoDescricao;
    }

    public void definirRota(String origemNome, String origemEndereco,
                            String destinoNome, String destinoEndereco, BigDecimal distanciaKm) {
        this.origemNome = origemNome;
        this.origemEndereco = origemEndereco;
        this.destinoNome = destinoNome;
        this.destinoEndereco = destinoEndereco;
        this.distanciaKm = distanciaKm;
    }

    /**
     * Remove todos os itens.
     *
     * Existe separado de `substituirItens` porque a edicao precisa de um FLUSH
     * entre apagar e inserir: ha `UNIQUE (romaneio_id, sequencia)` no banco, e
     * o Hibernate emitiria os INSERTs da nova lista antes dos DELETEs da
     * antiga, colidindo na sequencia 1. O mesmo cuidado existe na reconciliação
     * de trechos em `TripRouteService`.
     */
    public void limparItens() {
        itens.clear();
    }

    /** Renumera a sequencia impressa a partir de 1, na ordem recebida. */
    public void substituirItens(List<ManifestItem> novos) {
        itens.clear();
        for (int index = 0; index < novos.size(); index++) {
            ManifestItem item = novos.get(index);
            item.vincular(this, (short) (index + 1));
            itens.add(item);
        }
    }

    public void definirAutenticacao(String autenticacao) {
        this.autenticacao = autenticacao;
    }

    /** Soma da coluna "Qtd. Vol." — a linha de totais do documento. */
    public int totalVolumes() {
        return itens.stream().mapToInt(ManifestItem::getVolumes).sum();
    }

    /** Soma da coluna "Peso (kg)". */
    public BigDecimal totalPesoKg() {
        return itens.stream().map(ManifestItem::getPesoKg).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public Integer getId() {
        return id;
    }

    public TripStage getViagemEtapa() {
        return viagemEtapa;
    }

    public Trip getViagem() {
        return viagem;
    }

    public Short getTrechoOrdem() {
        return trechoOrdem;
    }

    public String getNumero() {
        return numero;
    }

    public LocalDateTime getEmitidoEm() {
        return emitidoEm;
    }

    public String getEmitidoPor() {
        return emitidoPor;
    }

    public String getAutenticacao() {
        return autenticacao;
    }

    public String getTransportadoraRazaoSocial() {
        return transportadoraRazaoSocial;
    }

    public String getTransportadoraCnpj() {
        return transportadoraCnpj;
    }

    public String getTransportadoraAntt() {
        return transportadoraAntt;
    }

    public String getMotoristaNome() {
        return motoristaNome;
    }

    public String getMotoristaCnh() {
        return motoristaCnh;
    }

    public String getVeiculoPlaca() {
        return veiculoPlaca;
    }

    public String getVeiculoDescricao() {
        return veiculoDescricao;
    }

    public String getOrigemNome() {
        return origemNome;
    }

    public String getOrigemEndereco() {
        return origemEndereco;
    }

    public String getDestinoNome() {
        return destinoNome;
    }

    public String getDestinoEndereco() {
        return destinoEndereco;
    }

    public BigDecimal getDistanciaKm() {
        return distanciaKm;
    }

    public List<ManifestItem> getItens() {
        return Collections.unmodifiableList(itens);
    }
}
