package br.dev.ricardomartins.odonto;

import org.junit.jupiter.api.Test;
import org.springframework.modulith.core.ApplicationModules;

/** Quebra o build se um módulo acessar tipos internos de outro ou se surgir dependência cíclica. */
class ModularidadeTest {

    @Test
    void respeitaAsFronteirasEntreModulos() {
        ApplicationModules.of(ClinicaOdontoApplication.class).verify();
    }
}
