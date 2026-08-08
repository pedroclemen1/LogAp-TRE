package br.com.logap.logitrack.config;

import java.time.Clock;
import java.time.ZoneId;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Relogio da aplicacao.
 *
 * Existe para que nenhuma regra de negocio chame `LocalDate.now()` direto. Com
 * o relogio injetado, um teste substitui o bean por `Clock.fixed(...)` e as
 * derivacoes que dependem de "hoje" — manutencao atrasada, recorte de periodo
 * do dashboard, expiracao do JWT — passam a ter resultado deterministico.
 *
 * As datas de negocio usam explicitamente America/Sao_Paulo, independentemente
 * do fuso configurado na JVM ou no container.
 */
@Configuration
public class TimeConfig {

    @Bean
    public Clock clock() {
        return Clock.system(ZoneId.of("America/Sao_Paulo"));
    }
}
