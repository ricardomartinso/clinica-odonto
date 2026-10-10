package br.dev.ricardomartins.odonto.prontuario;

import br.dev.ricardomartins.odonto.shared.Dente;
import br.dev.ricardomartins.odonto.shared.Faces;
import br.dev.ricardomartins.odonto.shared.RegraDeNegocioException;
import java.util.UUID;
import org.springframework.stereotype.Component;

/** Cria procedimentos clínicos a partir do catálogo; usado no planejamento e no registro de atendimento. */
@Component
class CatalogoDeProcedimentos {

    private final ProcedimentoRepository catalogo;

    CatalogoDeProcedimentos(ProcedimentoRepository catalogo) {
        this.catalogo = catalogo;
    }

    ProcedimentoClinico planejar(UUID pacienteId, DadosDoProcedimento dados) {
        Procedimento procedimento = catalogo.findById(dados.procedimentoId())
                .orElseThrow(() -> new RegraDeNegocioException("Procedimento não encontrado no catálogo."));
        return ProcedimentoClinico.planejar(pacienteId, procedimento,
                dados.dente() == null ? null : new Dente(dados.dente()),
                Faces.de(dados.faces()),
                dados.arcada(),
                dados.observacao() == null || dados.observacao().isBlank() ? null : dados.observacao().strip());
    }
}
