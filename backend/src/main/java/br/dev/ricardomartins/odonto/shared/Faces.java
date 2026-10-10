package br.dev.ricardomartins.odonto.shared;

import java.util.Arrays;
import java.util.Collection;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/** Conjunto imutável de faces, persistido em uma coluna como "M,O_I" (ordem canônica). */
public record Faces(Set<Face> valores) {

    public static final Faces NENHUMA = new Faces(Set.of());

    public Faces {
        valores = valores.isEmpty() ? Set.of() : Set.copyOf(EnumSet.copyOf(valores));
    }

    public static Faces de(Collection<Face> faces) {
        return faces == null || faces.isEmpty() ? NENHUMA : new Faces(EnumSet.copyOf(faces));
    }

    public boolean vazio() {
        return valores.isEmpty();
    }

    /** Em ordem canônica (M, D, O_I, V, L_P), para respostas estáveis. */
    public List<Face> ordenadas() {
        return valores.stream().sorted().toList();
    }

    String serializar() {
        return ordenadas().stream().map(Face::name).collect(Collectors.joining(","));
    }

    static Faces desserializar(String valor) {
        if (valor == null || valor.isBlank()) {
            return NENHUMA;
        }
        return de(Arrays.stream(valor.split(",")).map(Face::valueOf).toList());
    }
}
