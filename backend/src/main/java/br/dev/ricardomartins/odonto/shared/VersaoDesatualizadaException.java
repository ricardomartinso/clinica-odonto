package br.dev.ricardomartins.odonto.shared;

/** Resulta em 412: o cliente tentou alterar uma versão do registro que já não é a atual. */
public class VersaoDesatualizadaException extends RuntimeException {

    public VersaoDesatualizadaException() {
        super("O registro foi alterado desde a última leitura. Recarregue e tente novamente.");
    }
}
