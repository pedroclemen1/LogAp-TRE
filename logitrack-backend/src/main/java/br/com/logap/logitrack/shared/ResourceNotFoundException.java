package br.com.logap.logitrack.shared;

public class ResourceNotFoundException extends RuntimeException {

    private final String code;

    public ResourceNotFoundException(String recurso, Object id) {
        this("RESOURCE_NOT_FOUND", recurso, id);
    }

    public ResourceNotFoundException(String code, String recurso, Object id) {
        super("%s de id %s nao encontrado.".formatted(recurso, id));
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
