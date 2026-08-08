package br.com.logap.logitrack.auth;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import br.com.logap.logitrack.shared.CurrentUserProvider;

/**
 * Implementacao de producao da porta: le o autor do contexto do Spring Security.
 *
 * "Sistema" cobre o caso de rotina sem usuario autenticado (job, boot). Mantem
 * o mesmo texto que o `TripService` gravava antes, para nao mudar o historico
 * ja registrado no banco.
 */
@Component
public class SecurityContextCurrentUserProvider implements CurrentUserProvider {

    static final String SYSTEM_AUTHOR = "Sistema";

    @Override
    public String currentUserName() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            return SYSTEM_AUTHOR;
        }
        if (authentication.getPrincipal() instanceof AuthenticatedUserPrincipal principal) {
            return principal.displayName();
        }
        return authentication.getName();
    }
}
