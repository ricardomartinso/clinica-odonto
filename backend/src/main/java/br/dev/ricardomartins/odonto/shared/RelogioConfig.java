package br.dev.ricardomartins.odonto.shared;

import java.time.Clock;
import java.time.ZoneId;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
class RelogioConfig {

    /** Datas de negócio (idade, "hoje") seguem o fuso da clínica, não o do servidor. */
    @Bean
    Clock clock() {
        return Clock.system(ZoneId.of("America/Sao_Paulo"));
    }
}
