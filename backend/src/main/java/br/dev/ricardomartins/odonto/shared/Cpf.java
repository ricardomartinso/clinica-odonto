package br.dev.ricardomartins.odonto.shared;

/**
 * CPF validado (11 dígitos, sem máscara, com dígitos verificadores corretos).
 * {@link #toString()} devolve a forma mascarada para que o valor nunca vaze em logs por acidente.
 */
public record Cpf(String digitos) {

    public Cpf {
        if (!valido(digitos)) {
            throw new IllegalArgumentException("CPF inválido");
        }
    }

    public static boolean valido(String valor) {
        if (valor == null || !valor.matches("\\d{11}") || valor.chars().distinct().count() == 1) {
            return false;
        }
        return digitoVerificador(valor, 9) == valor.charAt(9) - '0'
                && digitoVerificador(valor, 10) == valor.charAt(10) - '0';
    }

    private static int digitoVerificador(String valor, int quantidade) {
        int soma = 0;
        for (int i = 0; i < quantidade; i++) {
            soma += (valor.charAt(i) - '0') * (quantidade + 1 - i);
        }
        int resto = (soma * 10) % 11;
        return resto == 10 ? 0 : resto;
    }

    /** Formato usado pela Receita em documentos públicos: ***.456.789-** */
    public String mascarado() {
        return "***." + digitos.substring(3, 6) + "." + digitos.substring(6, 9) + "-**";
    }

    @Override
    public String toString() {
        return mascarado();
    }
}
