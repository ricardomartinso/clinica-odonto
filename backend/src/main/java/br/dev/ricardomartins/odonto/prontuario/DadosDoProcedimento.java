package br.dev.ricardomartins.odonto.prontuario;

import br.dev.ricardomartins.odonto.shared.Arcada;
import br.dev.ricardomartins.odonto.shared.DenteValido;
import br.dev.ricardomartins.odonto.shared.Face;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.Set;
import java.util.UUID;
import org.springframework.lang.Nullable;

/** Procedimento a planejar (ou a registrar como realizado num atendimento). Dente em notação FDI. */
public record DadosDoProcedimento(
        @NotNull UUID procedimentoId,
        @DenteValido @Nullable Integer dente,
        @Nullable Set<Face> faces,
        @Nullable Arcada arcada,
        @Size(max = 500) @Nullable String observacao) {
}
