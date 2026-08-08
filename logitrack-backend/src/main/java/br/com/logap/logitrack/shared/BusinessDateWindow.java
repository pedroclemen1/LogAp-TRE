package br.com.logap.logitrack.shared;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;

import org.springframework.stereotype.Component;

/**
 * Janela de datas aceitas pelos cadastros operacionais.
 *
 * Existe porque as validacoes de data eram todas RELATIVAS — ordem dos trechos,
 * inicio antes do fim — e nenhuma perguntava se a data faz sentido no mundo.
 * Sem limite absoluto, `9999-05-20` era aceito e contaminava agenda, dashboard
 * e projecao financeira.
 *
 * A janela e deliberadamente ampla. O objetivo e recusar o absurdo, nao policiar
 * a operacao: lancamento retroativo e planejamento futuro continuam validos.
 * Por isso nao se usa `@Future` nem `@Past` nos DTOs — os dois recusariam metade
 * dos casos legitimos, e `@Min`/`@Max` nao se aplicam a data.
 *
 * O limite acompanha o relogio injetado, e nao um ano fixo no codigo, para que
 * a regra nao expire sozinha com a passagem do tempo e para que um teste com
 * `Clock.fixed(...)` tenha resultado deterministico.
 */
@Component
public class BusinessDateWindow {

    /** Cobre lancamento retroativo e correcao de historico com folga. */
    static final int YEARS_BACK = 5;

    /** Cobre planejamento de frota, que raramente passa de um ano. */
    static final int YEARS_AHEAD = 2;

    public static final String CODE = "DATE_OUT_OF_RANGE";

    private final Clock clock;

    public BusinessDateWindow(Clock clock) {
        this.clock = clock;
    }

    /** Primeiro dia aceito, inclusive. */
    public LocalDate earliest() {
        return LocalDate.now(clock).minusYears(YEARS_BACK);
    }

    /** Ultimo dia aceito, inclusive. */
    public LocalDate latest() {
        return LocalDate.now(clock).plusYears(YEARS_AHEAD);
    }

    /**
     * @param field nome de negocio do campo, usado na mensagem devolvida ao cliente.
     */
    public void validate(LocalDate value, String field) {
        if (value == null) return;
        if (value.isBefore(earliest()) || value.isAfter(latest())) {
            throw outOfRange(field);
        }
    }

    public void validate(LocalDateTime value, String field) {
        if (value == null) return;
        validate(value.toLocalDate(), field);
    }

    private BusinessRuleException outOfRange(String field) {
        return new BusinessRuleException(CODE,
            "%s deve estar entre %s e %s.".formatted(field, earliest(), latest()));
    }
}
