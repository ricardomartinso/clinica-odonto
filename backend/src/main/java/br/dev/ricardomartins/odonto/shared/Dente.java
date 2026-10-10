package br.dev.ricardomartins.odonto.shared;

/**
 * Dente na notação FDI (ISO 3950): dezena = quadrante, unidade = posição a partir da linha média.
 * Permanentes: quadrantes 1–4, posições 1–8 (11–48). Decíduos: quadrantes 5–8, posições 1–5 (51–85).
 */
public record Dente(int codigo) {

    public Dente {
        if (!valido(codigo)) {
            throw new IllegalArgumentException("Dente inválido na notação FDI: " + codigo);
        }
    }

    public static boolean valido(int codigo) {
        int quadrante = codigo / 10;
        int posicao = codigo % 10;
        return (quadrante >= 1 && quadrante <= 4 && posicao >= 1 && posicao <= 8)
                || (quadrante >= 5 && quadrante <= 8 && posicao >= 1 && posicao <= 5);
    }

    public int quadrante() {
        return codigo / 10;
    }

    public int posicao() {
        return codigo % 10;
    }

    public boolean deciduo() {
        return quadrante() >= 5;
    }

    /** Quadrantes 1, 2 (permanentes) e 5, 6 (decíduos) ficam na maxila. */
    public boolean superior() {
        int q = quadrante();
        return q == 1 || q == 2 || q == 5 || q == 6;
    }

    /** Incisivos e caninos (posições 1–3) têm borda incisal; os demais, face oclusal. */
    public boolean anterior() {
        return posicao() <= 3;
    }

    public Arcada arcada() {
        return superior() ? Arcada.SUPERIOR : Arcada.INFERIOR;
    }
}
