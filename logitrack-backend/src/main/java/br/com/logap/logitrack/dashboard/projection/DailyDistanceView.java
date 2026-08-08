package br.com.logap.logitrack.dashboard.projection;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Quilometragem concluida em um dia do periodo do Dashboard. */
public interface DailyDistanceView {
    LocalDate getData();

    BigDecimal getTotalKm();
}
