package br.dev.ricardomartins.odonto.pacientes;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import org.springframework.lang.Nullable;

/** Respostas da anamnese. {@code null} significa "não perguntado/não informado", distinto de {@code false}. */
public record DadosDaAnamnese(
        @Nullable Boolean alergico,
        @Size(max = 500) @Nullable String alergiasDescricao,
        @Nullable Boolean usaAnticoagulante,
        @Nullable Boolean diabetes,
        @Nullable Boolean hipertensao,
        @Nullable Boolean cardiopatia,
        @Nullable Boolean coagulopatia,
        @Nullable Boolean gestante,
        @Min(1) @Max(42) @Nullable Integer semanasGestacao,
        @Nullable Boolean fumante,
        @Nullable Boolean usaBisfosfonatos,
        @Nullable Boolean reacaoAnestesia,
        @Size(max = 1000) @Nullable String medicamentosEmUso,
        @Size(max = 2000) @Nullable String observacoes) {

    @Override
    public String toString() {
        return "DadosDaAnamnese[omitido]";
    }
}
