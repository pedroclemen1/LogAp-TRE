package br.com.logap.logitrack.auth.invitation;

public interface InvitationDeliveryPort {

    void deliver(InvitationDelivery delivery);

    record InvitationDelivery(String email, String activationUrl) {
    }
}
