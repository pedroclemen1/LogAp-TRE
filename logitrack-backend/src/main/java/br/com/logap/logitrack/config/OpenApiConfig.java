package br.com.logap.logitrack.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;

@Configuration
public class OpenApiConfig {

    /** Nome do esquema; referenciado pelo botao "Authorize" do Swagger UI. */
    public static final String BEARER_SCHEME = "bearer-jwt";

    @Bean
    OpenAPI logitrackOpenApi() {
        return new OpenAPI()
            .info(new Info()
                .title("LogiTrack Pro API")
                .version("v1")
                .description("""
                    Gestao de frota e dashboard analitico.

                    Documentacao em `/docs` (a raiz `/` redireciona para ca).

                    **Como autenticar:** chame `POST /api/auth/login` com uma conta
                    provisionada, copie o campo `token` e cole no botao **Authorize**
                    acima (sem escrever "Bearer" — o Swagger adiciona).

                    As metricas de `/api/dashboard` sao calculadas por consultas SQL
                    nativas e retornadas em uma unica resposta.
                    """)
                .contact(new Contact().name("LogAp")))
            .components(new Components().addSecuritySchemes(BEARER_SCHEME,
                new SecurityScheme()
                    .type(SecurityScheme.Type.HTTP)
                    .scheme("bearer")
                    .bearerFormat("JWT")
                    .description("Token devolvido por POST /api/auth/login")))
            .addSecurityItem(new SecurityRequirement().addList(BEARER_SCHEME));
    }
}
