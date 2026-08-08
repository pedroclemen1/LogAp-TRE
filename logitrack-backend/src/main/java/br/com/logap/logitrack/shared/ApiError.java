package br.com.logap.logitrack.shared;

import java.time.OffsetDateTime;
import java.util.Map;

/**
 * Corpo unico de erro da API. `campos` so aparece em falha de validacao —
 * a serializacao omite nulos (`default-property-inclusion: non_null`).
 */
public record ApiError(
    OffsetDateTime timestamp,
    int status,
    String error,
    String code,
    String message,
    String path,
    Map<String, String> campos
) {
    public static ApiError of(int status, String error, String code, String message, String path) {
        return new ApiError(OffsetDateTime.now(), status, error, code, message, path, null);
    }

    public static ApiError validation(String path, Map<String, String> campos) {
        return new ApiError(OffsetDateTime.now(), 400, "Bad Request", "VALIDATION_ERROR",
            "Falha de validacao nos campos enviados.", path, campos);
    }
}
