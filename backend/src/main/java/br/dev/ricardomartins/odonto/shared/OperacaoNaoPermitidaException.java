package br.dev.ricardomartins.odonto.shared;

/**
 * Resulta em 403: o usuário tem o papel necessário, mas não pode agir sobre este registro específico
 * (ex.: editar evolução de outro autor). A mensagem é exibida ao cliente.
 */
public class OperacaoNaoPermitidaException extends RuntimeException {

    public OperacaoNaoPermitidaException(String mensagem) {
        super(mensagem);
    }
}
