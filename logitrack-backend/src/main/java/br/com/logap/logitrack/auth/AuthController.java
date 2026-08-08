package br.com.logap.logitrack.auth;

import java.security.Principal;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.logap.logitrack.auth.dto.LoginRequest;
import br.com.logap.logitrack.auth.dto.LoginResponse;
import br.com.logap.logitrack.auth.dto.PasswordChangeRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Autenticacao", description = "Login e gestao da credencial do usuario")
public class AuthController {

    private final AuthService service;
    private final LoginClientIdentityResolver clientIdentityResolver;

    public AuthController(AuthService service, LoginClientIdentityResolver clientIdentityResolver) {
        this.service = service;
        this.clientIdentityResolver = clientIdentityResolver;
    }

    @PostMapping("/login")
    @SecurityRequirements
    @Operation(
        summary = "Autentica e devolve um token JWT",
        description = """
            Use uma conta provisionada pelo bootstrap ou ativada por convite.
            No ambiente de desenvolvimento, credenciais opcionais pertencem ao
            seed e nunca sao carregadas no perfil de producao.
            """)
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Autenticado"),
        @ApiResponse(responseCode = "401", description = "E-mail ou senha invalidos"),
        @ApiResponse(responseCode = "429", description = "Limite de tentativas excedido")
    })
    public ResponseEntity<LoginResponse> login(@RequestBody @Valid LoginRequest request,
                                               @RequestHeader(
                                                   value = LoginClientIdentityResolver.HEADER,
                                                   required = false) String signedClientIdentity,
                                               HttpServletRequest httpRequest) {
        String clientIdentity = clientIdentityResolver.resolve(
            signedClientIdentity, httpRequest.getRemoteAddr());
        return ResponseEntity.ok(service.login(request, clientIdentity));
    }

    @PatchMapping("/password")
    @Operation(summary = "Troca a senha do usuario autenticado")
    public ResponseEntity<LoginResponse> changePassword(
        Principal principal,
        @RequestBody @Valid PasswordChangeRequest request) {
        return ResponseEntity.ok(service.changePassword(principal.getName(), request));
    }
}
