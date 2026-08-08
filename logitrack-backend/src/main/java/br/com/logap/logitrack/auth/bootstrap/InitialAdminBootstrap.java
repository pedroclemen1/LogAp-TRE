package br.com.logap.logitrack.auth.bootstrap;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class InitialAdminBootstrap implements ApplicationRunner {

    private final InitialAdminProperties properties;
    private final InitialAdminProvisioningService provisioningService;

    public InitialAdminBootstrap(InitialAdminProperties properties,
                                 InitialAdminProvisioningService provisioningService) {
        this.properties = properties;
        this.provisioningService = provisioningService;
    }

    @Override
    public void run(ApplicationArguments args) {
        provisioningService.provision(properties);
    }
}
