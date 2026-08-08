package br.com.logap.logitrack.auth.invitation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AcceptInvitationRequest(
    @NotBlank(message = "Informe o token do convite.")
    @Size(min = 32, max = 200, message = "Token do convite invalido.")
    String token,

    @NotBlank(message = "Informe o nome.")
    @Size(max = 100, message = "O nome deve possuir no maximo 100 caracteres.")
    String nome,

    @NotBlank(message = "Informe a senha.")
    @Size(max = 72, message = "A senha deve possuir no maximo 72 caracteres.")
    String senha
) {
}
