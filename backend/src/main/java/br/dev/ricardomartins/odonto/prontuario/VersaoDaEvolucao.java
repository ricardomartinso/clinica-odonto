package br.dev.ricardomartins.odonto.prontuario;

import java.time.Instant;
import java.time.LocalDate;

/** Uma revisão da evolução segundo o Envers: o que estava registrado e quem fez a alteração. */
public record VersaoDaEvolucao(
        long revisao,
        Instant momento,
        EvolucaoResponse.Autor alteradaPor,
        TipoDeAlteracao tipo,
        LocalDate dataAtendimento,
        String texto) {

    public enum TipoDeAlteracao {
        CRIACAO,
        EDICAO,
        ANULACAO
    }

    @Override
    public String toString() {
        return "VersaoDaEvolucao[revisao=" + revisao + "]";
    }
}
