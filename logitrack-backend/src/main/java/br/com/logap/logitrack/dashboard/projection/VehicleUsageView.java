package br.com.logap.logitrack.dashboard.projection;

import java.math.BigDecimal;

/** Projecao da metrica 4. */
public interface VehicleUsageView {
    Integer getId();

    String getPlaca();

    String getModelo();

    String getTipo();

    BigDecimal getKmAcumulado();
}
