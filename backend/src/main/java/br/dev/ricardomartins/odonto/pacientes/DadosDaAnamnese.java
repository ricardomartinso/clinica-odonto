package br.dev.ricardomartins.odonto.pacientes;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

/** Respostas da anamnese. {@code null} significa "não perguntado/não informado", distinto de {@code false}. */
public record DadosDaAnamnese(
        Boolean alergico,
        @Size(max = 500) String alergiasDescricao,
        Boolean usaAnticoagulante,
        Boolean diabetes,
        Boolean hipertensao,
        Boolean cardiopatia,
        Boolean coagulopatia,
        Boolean gestante,
        @Min(1) @Max(42) Integer semanasGestacao,
        Boolean fumante,
        Boolean usaBisfosfonatos,
        Boolean reacaoAnestesia,
        @Size(max = 1000) String medicamentosEmUso,
        @Size(max = 2000) String observacoes) {

    @Override
    public String toString() {
        return "DadosDaAnamnese[omitido]";
    }
}
