package br.dev.ricardomartins.odonto.shared;

/**
 * Resulta em 422: a requisição é sintaticamente válida, mas viola uma regra do domínio.
 * A mensagem é exibida ao cliente: não incluir dados pessoais.
 */
public class RegraDeNegocioException extends RuntimeException {

    public RegraDeNegocioException(String mensagem) {
        super(mensagem);
    }
}
