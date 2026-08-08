package br.com.logap.logitrack.auth.invitation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record InvitationTokenRequest(
    @NotBlank(message = "Informe o token do convite.")
    @Size(min = 32, max = 200, message = "Token do convite invalido.")
    String token
) {
}
