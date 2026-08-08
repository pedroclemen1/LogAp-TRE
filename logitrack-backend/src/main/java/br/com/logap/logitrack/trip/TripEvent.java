package br.com.logap.logitrack.trip;

import java.time.LocalDateTime;

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
@Table(name = "viagem_eventos")
public class TripEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "viagem_id", nullable = false)
    private Trip viagem;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TripEventType tipo;

    @Column(nullable = false, length = 120)
    private String titulo;

    @Column(length = 500)
    private String detalhe;

    @Column(nullable = false, length = 100)
    private String autor;

    @Column(name = "ocorrido_em", nullable = false)
    private LocalDateTime ocorridoEm;

    protected TripEvent() {
    }

    public TripEvent(Trip viagem, TripEventType tipo, String titulo, String detalhe,
                     String autor, LocalDateTime ocorridoEm) {
        this.viagem = viagem;
        this.tipo = tipo;
        this.titulo = titulo;
        this.detalhe = detalhe;
        this.autor = autor;
        this.ocorridoEm = ocorridoEm;
    }

    public Integer getId() {
        return id;
    }

    public TripEventType getTipo() {
        return tipo;
    }

    public String getTitulo() {
        return titulo;
    }

    public String getDetalhe() {
        return detalhe;
    }

    public String getAutor() {
        return autor;
    }

    public LocalDateTime getOcorridoEm() {
        return ocorridoEm;
    }
}
