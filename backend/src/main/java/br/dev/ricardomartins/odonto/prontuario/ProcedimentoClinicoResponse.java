package br.dev.ricardomartins.odonto.prontuario;

import br.dev.ricardomartins.odonto.shared.Arcada;
import br.dev.ricardomartins.odonto.shared.Face;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.lang.Nullable;

public record ProcedimentoClinicoResponse(
        UUID id,
        ProcedimentoDoCatalogo procedimento,
        @Nullable Integer dente,
        List<Face> faces,
        @Nullable Arcada arcada,
        String local,
        StatusProcedimento status,
        @Nullable String observacao,
        @Nullable UUID evolucaoId,
        @Nullable LocalDate realizadoEm,
        @Nullable String motivo,
        Instant criadoEm) {

    static ProcedimentoClinicoResponse de(ProcedimentoClinico p) {
        return new ProcedimentoClinicoResponse(
                p.getId(),
                ProcedimentoDoCatalogo.de(p.getProcedimento()),
                p.getDente() == null ? null : p.getDente().codigo(),
                p.getFaces().ordenadas(),
                p.getArcada(),
                p.local(),
                p.getStatus(),
                p.getObservacao(),
                p.getEvolucaoId(),
                p.getRealizadoEm(),
                p.getMotivo(),
                p.getCriadoEm());
    }
}
