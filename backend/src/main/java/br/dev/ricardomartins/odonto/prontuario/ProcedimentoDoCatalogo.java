package br.dev.ricardomartins.odonto.prontuario;

import java.util.UUID;

public record ProcedimentoDoCatalogo(UUID id, String nome, Abrangencia abrangencia) {

    static ProcedimentoDoCatalogo de(Procedimento procedimento) {
        return new ProcedimentoDoCatalogo(procedimento.getId(), procedimento.getNome(), procedimento.getAbrangencia());
    }
}
