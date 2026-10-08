package br.dev.ricardomartins.odonto.shared;

/**
 * Resulta em 409: a operação conflita com o estado atual (duplicidade, versão desatualizada).
 * A mensagem é exibida ao cliente: não incluir dados pessoais.
 */
public class ConflitoException extends RuntimeException {

    public ConflitoException(String mensagem) {
        super(mensagem);
    }
}
