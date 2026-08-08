package br.com.logap.logitrack.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * A raiz da API leva a documentacao.
 *
 * Sem isto, `GET /` cai no `anyRequest().authenticated()` e devolve 401 —
 * quem abre `localhost:8080` no navegador conclui que a API esta fora do ar.
 */
@Configuration
@ConditionalOnProperty(
    name = "springdoc.swagger-ui.enabled",
    havingValue = "true",
    matchIfMissing = true)
public class RootRedirectConfig implements WebMvcConfigurer {

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        registry.addRedirectViewController("/", "/docs");
    }
}
