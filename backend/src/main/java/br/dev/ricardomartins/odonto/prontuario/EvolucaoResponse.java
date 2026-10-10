package br.dev.ricardomartins.odonto.prontuario;

import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.lang.Nullable;

public record EvolucaoResponse(
        UUID id,
        LocalDate dataAtendimento,
        String texto,
        Autor autor,
        @Nullable Instant editadaEm,
        @Nullable Anulacao anulacao,
        List<ProcedimentoClinicoResponse> procedimentosRealizados,
        Instant criadoEm,
        @JsonIgnore long versao) {

    public record Autor(UUID id, String nome) {
    }

    public record Anulacao(Instant em, Autor por, String motivo) {
    }

    static EvolucaoResponse de(EvolucaoClinica evolucao, List<ProcedimentoClinicoResponse> procedimentos,
            Map<UUID, String> nomes) {
        Anulacao anulacao = evolucao.anulada()
                ? new Anulacao(evolucao.getAnuladaEm(), autor(evolucao.getAnuladaPor(), nomes),
                        evolucao.getMotivoAnulacao())
                : null;
        return new EvolucaoResponse(evolucao.getId(), evolucao.getDataAtendimento(), evolucao.getTexto(),
                autor(evolucao.getAutorId(), nomes), evolucao.getEditadaEm(), anulacao, procedimentos,
                evolucao.getCriadoEm(), evolucao.getVersao());
    }

    static Autor autor(UUID id, Map<UUID, String> nomes) {
        return new Autor(id, nomes.getOrDefault(id, "Usuário removido"));
    }

    @Override
    public String toString() {
        return "EvolucaoResponse[id=" + id + "]";
    }
}
