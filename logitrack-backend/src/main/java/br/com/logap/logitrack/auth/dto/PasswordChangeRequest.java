package br.com.logap.logitrack.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PasswordChangeRequest(
    @NotBlank(message = "Informe a senha atual.")
    @Size(max = 72, message = "A senha atual deve possuir no maximo 72 caracteres.")
    String senhaAtual,

    @NotBlank(message = "Informe a nova senha.")
    @Size(max = 72, message = "A nova senha deve possuir no maximo 72 caracteres.")
    String novaSenha
) {
}
