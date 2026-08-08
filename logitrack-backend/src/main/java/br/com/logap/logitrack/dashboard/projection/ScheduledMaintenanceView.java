package br.com.logap.logitrack.dashboard.projection;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Projecao da metrica 3. */
public interface ScheduledMaintenanceView {
    Integer getId();

    String getPlaca();

    String getModelo();

    LocalDate getDataInicio();

    String getTipoServico();

    BigDecimal getCustoEstimado();

    String getStatus();
}
