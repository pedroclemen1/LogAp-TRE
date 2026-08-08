package br.com.logap.logitrack.shared;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;

import org.junit.jupiter.api.Test;

class BusinessDateWindowTest {

    private static final ZoneId ZONE = ZoneId.of("America/Sao_Paulo");
    private static final LocalDate HOJE = LocalDate.of(2026, 8, 8);

    /** Relogio fixo: a janela e relativa a "hoje" e o teste precisa ser deterministico. */
    private final BusinessDateWindow window = new BusinessDateWindow(
        Clock.fixed(ZonedDateTime.of(HOJE.atStartOfDay(), ZONE).toInstant(), ZONE));

    @Test
    void aceitaHoje() {
        assertThatCode(() -> window.validate(HOJE, "A data")).doesNotThrowAnyException();
    }

    @Test
    void recusaAnoAbsurdoQueMotivouARegra() {
        assertThatThrownBy(() -> window.validate(LocalDate.of(9999, 5, 20), "A data de saida"))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("A data de saida")
            .extracting(exception -> ((BusinessRuleException) exception).getCode())
            .isEqualTo(BusinessDateWindow.CODE);
    }

    @Test
    void aceitaLancamentoRetroativoDentroDaJanela() {
        assertThatCode(() -> window.validate(HOJE.minusYears(4), "A data"))
            .doesNotThrowAnyException();
    }

    @Test
    void recusaPassadoAlemDaJanela() {
        assertThatThrownBy(() -> window.validate(HOJE.minusYears(6), "A data"))
            .isInstanceOf(BusinessRuleException.class);
    }

    @Test
    void aceitaPlanejamentoFuturoDentroDaJanela() {
        assertThatCode(() -> window.validate(HOJE.plusYears(1), "A data"))
            .doesNotThrowAnyException();
    }

    @Test
    void recusaFuturoAlemDaJanela() {
        assertThatThrownBy(() -> window.validate(HOJE.plusYears(3), "A data"))
            .isInstanceOf(BusinessRuleException.class);
    }

    @Test
    void bordasSaoInclusivas() {
        assertThatCode(() -> {
            window.validate(window.earliest(), "A data");
            window.validate(window.latest(), "A data");
        }).doesNotThrowAnyException();
    }

    @Test
    void nuloEIgnorado() {
        // Ausencia pertence ao @NotNull do DTO, que produz mensagem propria.
        assertThatCode(() -> {
            window.validate((LocalDate) null, "A data");
            window.validate((LocalDateTime) null, "A data");
        }).doesNotThrowAnyException();
    }

    @Test
    void avaliaApenasODiaDeUmLocalDateTime() {
        assertThatCode(() -> window.validate(window.latest().atTime(23, 59), "A data"))
            .doesNotThrowAnyException();
        assertThatThrownBy(() -> window.validate(window.latest().plusDays(1).atStartOfDay(), "A data"))
            .isInstanceOf(BusinessRuleException.class);
    }

    @Test
    void mensagemInformaOIntervaloAceito() {
        assertThatThrownBy(() -> window.validate(LocalDate.of(9999, 1, 1), "O inicio previsto"))
            .hasMessageContaining(window.earliest().toString())
            .hasMessageContaining(window.latest().toString());
    }

    @Test
    void janelaAcompanhaORelogio() {
        assertThat(window.earliest()).isEqualTo(HOJE.minusYears(5));
        assertThat(window.latest()).isEqualTo(HOJE.plusYears(2));
    }
}
