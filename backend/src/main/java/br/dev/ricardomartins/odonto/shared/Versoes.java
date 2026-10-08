package br.dev.ricardomartins.odonto.shared;

import java.util.Optional;

/**
 * Lock otimista exposto via HTTP: a versão da entidade vira o ETag nas leituras e é exigida de volta no
 * If-Match nas alterações. Evita que uma edição sobrescreva silenciosamente outra feita em paralelo.
 */
public final class Versoes {

    private Versoes() {
    }

    public static String etag(long versao) {
        return "\"" + versao + "\"";
    }

    /** Versão informada no If-Match; vazio se o header estiver ausente. Valor malformado nunca casa. */
    public static Optional<Long> doIfMatch(String ifMatch) {
        if (ifMatch == null || ifMatch.isBlank()) {
            return Optional.empty();
        }
        String valor = ifMatch.strip();
        if (valor.startsWith("W/")) {
            valor = valor.substring(2);
        }
        valor = valor.replace("\"", "");
        try {
            return Optional.of(Long.parseLong(valor));
        } catch (NumberFormatException e) {
            return Optional.of(-1L);
        }
    }

    public static long exigidaDoIfMatch(String ifMatch) {
        return doIfMatch(ifMatch).orElseThrow(VersaoObrigatoriaException::new);
    }

    public static void conferir(Long versaoAtual, long versaoEsperada) {
        if (versaoAtual == null || versaoAtual != versaoEsperada) {
            throw new VersaoDesatualizadaException();
        }
    }
}
