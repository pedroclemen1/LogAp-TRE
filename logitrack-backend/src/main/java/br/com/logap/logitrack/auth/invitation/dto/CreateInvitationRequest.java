package br.com.logap.logitrack.auth.invitation.dto;

import br.com.logap.logitrack.auth.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateInvitationRequest(
    @NotBlank(message = "Informe o e-mail.")
    @Email(message = "E-mail invalido.")
    @Size(max = 150, message = "O e-mail deve possuir no maximo 150 caracteres.")
    String email,

    @NotNull(message = "Selecione o perfil.")
    UserRole perfil
) {
}
