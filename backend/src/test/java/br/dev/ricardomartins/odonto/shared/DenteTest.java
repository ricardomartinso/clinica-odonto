package br.dev.ricardomartins.odonto.shared;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class DenteTest {

    @ParameterizedTest
    @ValueSource(ints = {11, 18, 21, 28, 31, 38, 41, 48, 51, 55, 61, 65, 71, 75, 81, 85})
    void aceitaPermanentesEDeciduos(int codigo) {
        assertThat(Dente.valido(codigo)).isTrue();
    }

    @ParameterizedTest
    @ValueSource(ints = {0, 10, 19, 49, 56, 66, 76, 86, 91, 9, 100})
    void recusaCodigosForaDaNotacaoFdi(int codigo) {
        assertThat(Dente.valido(codigo)).isFalse();
    }

    @Test
    void naoPodeSerConstruidoInvalido() {
        assertThatThrownBy(() -> new Dente(19)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void classificaPorArcadaETipo() {
        assertThat(new Dente(11).superior()).isTrue();
        assertThat(new Dente(46).superior()).isFalse();
        assertThat(new Dente(63).superior()).isTrue();
        assertThat(new Dente(85).arcada()).isEqualTo(Arcada.INFERIOR);
        assertThat(new Dente(13).anterior()).isTrue();
        assertThat(new Dente(14).anterior()).isFalse();
        assertThat(new Dente(54).deciduo()).isTrue();
    }

    @Test
    void nomeDaFaceDependeDoDente() {
        assertThat(Face.O_I.nomeNo(new Dente(11))).isEqualTo("Incisal");
        assertThat(Face.O_I.nomeNo(new Dente(36))).isEqualTo("Oclusal");
        assertThat(Face.L_P.nomeNo(new Dente(26))).isEqualTo("Palatina");
        assertThat(Face.L_P.nomeNo(new Dente(42))).isEqualTo("Lingual");
    }

    @Test
    void facesSerializamEmOrdemCanonica() {
        Faces faces = Faces.de(java.util.List.of(Face.L_P, Face.M, Face.O_I));

        assertThat(faces.serializar()).isEqualTo("M,O_I,L_P");
        assertThat(Faces.desserializar("M,O_I,L_P")).isEqualTo(faces);
        assertThat(Faces.desserializar(null).vazio()).isTrue();
    }
}
