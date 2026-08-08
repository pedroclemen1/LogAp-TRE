package br.com.logap.logitrack.auth;

import java.io.IOException;
import java.util.List;

import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Le o cabecalho Authorization e popula o SecurityContext.
 *
 * Nao rejeita requisicao sem token: apenas nao autentica. Quem decide o que
 * exige autenticacao e o SecurityConfig, mantendo a regra em um lugar so.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String HEADER = "Authorization";
    private static final String PREFIX = "Bearer ";

    private final JwtService jwtService;
    private final UserRepository userRepository;

    public JwtAuthenticationFilter(JwtService jwtService, UserRepository userRepository) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {

        String header = request.getHeader(HEADER);
        if (header != null && header.startsWith(PREFIX)
            && SecurityContextHolder.getContext().getAuthentication() == null) {

            JwtService.JwtIdentity identity = jwtService.extractIdentity(header.substring(PREFIX.length()));
            if (identity != null) {
                userRepository.findByEmailIgnoreCaseAndAtivoTrue(identity.email()).ifPresent(user -> {
                    if (user.getCredentialVersion() != identity.credentialVersion()) {
                        return;
                    }
                    var authorities = List.of(new SimpleGrantedAuthority("ROLE_" + user.getPerfil().name()));
                    var principal = new AuthenticatedUserPrincipal(
                        user.getId(),
                        user.getEmail(),
                        user.getNome(),
                        user.getPerfil(),
                        user.getTrocaSenhaObrigatoria());
                    var authentication = new UsernamePasswordAuthenticationToken(principal, null, authorities);
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                });
            }
        }

        filterChain.doFilter(request, response);
    }
}
