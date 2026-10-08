package br.dev.ricardomartins.odonto.shared;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;
import org.junit.jupiter.api.Test;

class UuidV7Test {

    @Test
    void geraVersao7ComVarianteRfc() {
        UUID uuid = UuidV7.gerar();

        assertThat(uuid.version()).isEqualTo(7);
        assertThat(uuid.variant()).isEqualTo(2);
    }

    @Test
    void codificaOTimestampNosPrimeiros48Bits() {
        long antes = System.currentTimeMillis();
        long timestamp = UuidV7.gerar().getMostSignificantBits() >>> 16;
        long depois = System.currentTimeMillis();

        assertThat(timestamp).isBetween(antes, depois);
    }

    @Test
    void uuidsDeMilissegundosDiferentesSaoOrdenaveis() throws InterruptedException {
        UUID primeiro = UuidV7.gerar();
        Thread.sleep(2);
        UUID segundo = UuidV7.gerar();

        assertThat(primeiro.toString()).isLessThan(segundo.toString());
    }
}
