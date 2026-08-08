package br.com.logap.logitrack.trip;

public enum TripEventType {
    CRIADA,
    INICIADA,
    ROTA_ATUALIZADA,
    CONCLUIDA,
    CANCELADA,
    /** Chegada registrada em um ponto intermediario ou final da rota. */
    TRECHO_CONCLUIDO
}
