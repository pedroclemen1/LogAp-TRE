package br.com.logap.logitrack.auth.dto;

import java.time.OffsetDateTime;

import br.com.logap.logitrack.auth.UserRole;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Token de acesso e dados do usuario autenticado")
public record LoginResponse(
    @Schema(description = "Cole este valor no botao Authorize do Swagger, sem o prefixo Bearer")
    String token,
    OffsetDateTime expiraEm,
    String nome,
    String email,
    UserRole perfil,
    boolean trocaSenhaObrigatoria
) {
}
