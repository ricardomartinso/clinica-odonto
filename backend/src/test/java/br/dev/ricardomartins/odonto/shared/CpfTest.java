package br.dev.ricardomartins.odonto.shared;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

class CpfTest {

    @ParameterizedTest
    @ValueSource(strings = {"10433218100", "96001338914", "08386379499"})
    void aceitaCpfComDigitosVerificadoresCorretos(String valor) {
        assertThat(Cpf.valido(valor)).isTrue();
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {
            "10433218101",      // dígito verificador errado
            "11111111111",      // todos iguais passam no cálculo, mas são inválidos
            "104.332.181-00",   // com máscara
            "1043321810",       // 10 dígitos
            "1043321810a"})
    void recusaCpfInvalido(String valor) {
        assertThat(Cpf.valido(valor)).isFalse();
    }

    @Test
    void naoPodeSerConstruidoInvalido() {
        assertThatThrownBy(() -> new Cpf("12345678900")).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void toStringNuncaExpoeOCpfCompleto() {
        Cpf cpf = new Cpf("10433218100");

        assertThat(cpf.mascarado()).isEqualTo("***.332.181-**");
        assertThat(cpf.toString()).isEqualTo("***.332.181-**").doesNotContain("10433218100");
    }
}
