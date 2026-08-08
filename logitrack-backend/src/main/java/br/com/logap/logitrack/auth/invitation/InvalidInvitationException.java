package br.com.logap.logitrack.auth.invitation;

public class InvalidInvitationException extends RuntimeException {

    public InvalidInvitationException() {
        super("Convite invalido, expirado ou ja utilizado.");
    }
}
