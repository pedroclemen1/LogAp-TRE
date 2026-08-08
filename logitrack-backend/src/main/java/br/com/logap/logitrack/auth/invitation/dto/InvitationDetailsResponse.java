package br.com.logap.logitrack.auth.invitation.dto;

import java.time.OffsetDateTime;

import br.com.logap.logitrack.auth.UserRole;

public record InvitationDetailsResponse(
    String email,
    UserRole perfil,
    OffsetDateTime expiraEm
) {
}
