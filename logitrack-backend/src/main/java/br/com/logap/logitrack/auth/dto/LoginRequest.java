package br.com.logap.logitrack.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Credenciais de acesso")
public record LoginRequest(

    @NotBlank(message = "Informe o e-mail.")
    @Email(message = "E-mail invalido.")
    @Size(max = 150, message = "O e-mail deve possuir no maximo 150 caracteres.")
    @Schema(example = "gestor@empresa.com", requiredMode = Schema.RequiredMode.REQUIRED)
    String email,

    @NotBlank(message = "Informe a senha.")
    @Size(max = 72, message = "A senha deve possuir no maximo 72 caracteres.")
    @Schema(example = "senha-pessoal-forte", requiredMode = Schema.RequiredMode.REQUIRED)
    String senha
) {
}
