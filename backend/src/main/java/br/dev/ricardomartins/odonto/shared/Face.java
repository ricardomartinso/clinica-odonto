package br.dev.ricardomartins.odonto.shared;

/**
 * As cinco faces canônicas de um dente. O nome exibido de {@link #O_I} e {@link #L_P} depende do dente
 * (incisal em anteriores, oclusal em posteriores; palatina na maxila, lingual na mandíbula). Guardar a
 * face canônica impede estados inválidos como "incisal em molar".
 */
public enum Face {
    M,
    D,
    O_I,
    V,
    L_P;

    public String nomeNo(Dente dente) {
        return switch (this) {
            case M -> "Mesial";
            case D -> "Distal";
            case O_I -> dente.anterior() ? "Incisal" : "Oclusal";
            case V -> "Vestibular";
            case L_P -> dente.superior() ? "Palatina" : "Lingual";
        };
    }
}
