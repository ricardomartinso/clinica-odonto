package br.dev.ricardomartins.odonto.pacientes;

final class Textos {

    private Textos() {
    }

    /** Remove espaços nas pontas; texto em branco vira {@code null}. */
    static String limpar(String texto) {
        return texto == null || texto.isBlank() ? null : texto.strip();
    }
}
