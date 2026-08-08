package br.com.logap.logitrack.trip;

import java.time.LocalDateTime;

/**
 * Status derivado dos fatos de inicio, chegada e cancelamento; nao e coluna.
 */
public enum TripStatus {
    PROGRAMADA,
    EM_ANDAMENTO,
    CONCLUIDA,
    CANCELADA;

    public static TripStatus of(LocalDateTime iniciadaEm, LocalDateTime chegada, LocalDateTime canceladaEm) {
        if (canceladaEm != null) {
            return CANCELADA;
        }
        if (chegada != null) {
            return CONCLUIDA;
        }
        return iniciadaEm == null ? PROGRAMADA : EM_ANDAMENTO;
    }
}
