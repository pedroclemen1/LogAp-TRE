package br.com.logap.logitrack.auth.invitation;

import java.security.Principal;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.logap.logitrack.auth.invitation.dto.AcceptInvitationRequest;
import br.com.logap.logitrack.auth.invitation.dto.CreateInvitationRequest;
import br.com.logap.logitrack.auth.invitation.dto.CreateInvitationResponse;
import br.com.logap.logitrack.auth.invitation.dto.InvitationDetailsResponse;
import br.com.logap.logitrack.auth.invitation.dto.InvitationTokenRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth/invitations")
@Tag(name = "Convites", description = "Cadastro fechado de usuarios por convite individual")
public class InvitationController {

    private final InvitationService service;

    public InvitationController(InvitationService service) {
        this.service = service;
    }

    @PostMapping
    @PreAuthorize("hasRole('GESTOR')")
    @Operation(summary = "Gera um convite individual")
    public ResponseEntity<CreateInvitationResponse> create(
        Principal principal,
        @RequestBody @Valid CreateInvitationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(principal.getName(), request));
    }

    @PostMapping("/validate")
    @SecurityRequirements
    @Operation(summary = "Valida um token antes da ativacao da conta")
    public ResponseEntity<InvitationDetailsResponse> validate(
        @RequestBody @Valid InvitationTokenRequest request) {
        return ResponseEntity.ok(service.validate(request.token()));
    }

    @PostMapping("/accept")
    @SecurityRequirements
    @Operation(summary = "Ativa a conta e invalida o convite")
    public ResponseEntity<Void> accept(@RequestBody @Valid AcceptInvitationRequest request) {
        service.accept(request);
        return ResponseEntity.noContent().build();
    }
}
