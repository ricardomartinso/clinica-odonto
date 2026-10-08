package br.dev.ricardomartins.odonto.shared;

import java.util.UUID;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.AuditorAware;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@Configuration(proxyBeanMethods = false)
@EnableJpaAuditing(auditorAwareRef = "usuarioAtual")
class AuditoriaConfig {

    @Bean
    AuditorAware<UUID> usuarioAtual() {
        return UsuarioIdentificado::atual;
    }
}
