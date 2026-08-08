package br.com.logap.logitrack.auth;

import java.security.Principal;

public record AuthenticatedUserPrincipal(
    Integer id,
    String email,
    String displayName,
    UserRole role,
    boolean passwordChangeRequired
) implements Principal {

    @Override
    public String getName() {
        return email;
    }
}
