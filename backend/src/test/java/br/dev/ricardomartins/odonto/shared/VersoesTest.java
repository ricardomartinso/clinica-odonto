package br.dev.ricardomartins.odonto.shared;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class VersoesTest {

    @Test
    void etagEhAVersaoEntreAspas() {
        assertThat(Versoes.etag(3)).isEqualTo("\"3\"");
    }

    @Test
    void interpretaIfMatchForteFracoOuSemAspas() {
        assertThat(Versoes.doIfMatch("\"3\"")).contains(3L);
        assertThat(Versoes.doIfMatch("W/\"3\"")).contains(3L);
        assertThat(Versoes.doIfMatch("3")).contains(3L);
    }

    @Test
    void ifMatchMalformadoNuncaCasaComUmaVersao() {
        assertThat(Versoes.doIfMatch("\"abc\"")).contains(-1L);
    }

    @Test
    void ifMatchAusenteEhRecusadoQuandoObrigatorio() {
        assertThat(Versoes.doIfMatch(null)).isEmpty();
        assertThatThrownBy(() -> Versoes.exigidaDoIfMatch(" ")).isInstanceOf(VersaoObrigatoriaException.class);
    }

    @Test
    void conferirRecusaVersaoDiferente() {
        assertThatThrownBy(() -> Versoes.conferir(2L, 1L)).isInstanceOf(VersaoDesatualizadaException.class);
    }
}
