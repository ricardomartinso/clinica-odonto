package br.dev.ricardomartins.odonto.shared;

/** Resulta em 404. A mensagem é exibida ao cliente: não incluir dados pessoais. */
public class RecursoNaoEncontradoException extends RuntimeException {

    public RecursoNaoEncontradoException(String mensagem) {
        super(mensagem);
    }
}
