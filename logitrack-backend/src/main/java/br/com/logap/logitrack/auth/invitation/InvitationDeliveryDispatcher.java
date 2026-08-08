package br.com.logap.logitrack.auth.invitation;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import br.com.logap.logitrack.auth.invitation.InvitationDeliveryPort.InvitationDelivery;

@Component
class InvitationDeliveryDispatcher {

    private static final Logger LOGGER = LoggerFactory.getLogger(InvitationDeliveryDispatcher.class);

    private final ApplicationEventPublisher eventPublisher;
    private final List<InvitationDeliveryPort> deliveryPorts;

    InvitationDeliveryDispatcher(ApplicationEventPublisher eventPublisher,
                                 List<InvitationDeliveryPort> deliveryPorts) {
        this.eventPublisher = eventPublisher;
        this.deliveryPorts = deliveryPorts;
    }

    void schedule(InvitationDelivery delivery) {
        eventPublisher.publishEvent(delivery);
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void dispatch(InvitationDelivery delivery) {
        for (InvitationDeliveryPort port : deliveryPorts) {
            try {
                port.deliver(delivery);
            } catch (RuntimeException exception) {
                LOGGER.error("Falha ao entregar convite no provedor {}.",
                    exception.getClass().getSimpleName());
            }
        }
    }
}
