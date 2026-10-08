package br.dev.ricardomartins.odonto.shared;

/** Resulta em 428: a alteração exige o header If-Match com a versão lida (ETag). */
public class VersaoObrigatoriaException extends RuntimeException {

    public VersaoObrigatoriaException() {
        super("Informe o header If-Match com o ETag obtido na última leitura do registro.");
    }
}
