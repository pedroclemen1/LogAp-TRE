package br.com.logap.logitrack.shared;

/** Entrada sintaticamente valida que viola uma regra de dominio (HTTP 422). */
public class BusinessRuleException extends RuntimeException {

    private final String code;

    public BusinessRuleException(String message) {
        this("BUSINESS_RULE_VIOLATION", message);
    }

    public BusinessRuleException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
