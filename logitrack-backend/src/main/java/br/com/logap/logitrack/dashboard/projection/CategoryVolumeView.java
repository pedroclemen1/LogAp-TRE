package br.com.logap.logitrack.dashboard.projection;

import java.math.BigDecimal;

/** Projecao da metrica 2. Os nomes casam com os alias do SELECT. */
public interface CategoryVolumeView {
    String getTipo();

    Long getTotalViagens();

    BigDecimal getTotalKm();
}
