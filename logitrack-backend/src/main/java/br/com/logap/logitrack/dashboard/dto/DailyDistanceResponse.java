package br.com.logap.logitrack.dashboard.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record DailyDistanceResponse(LocalDate data, BigDecimal totalKm) {
}
