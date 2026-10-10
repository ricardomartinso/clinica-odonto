package br.dev.ricardomartins.odonto.prontuario;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.lang.Nullable;

/**
 * Um atendimento registrado de uma vez: a evolução, os procedimentos planejados que foram feitos e os
 * que foram feitos sem planejamento prévio. Tudo ou nada.
 */
public record RegistroDeAtendimento(
        @NotNull LocalDate dataAtendimento,
        @NotBlank @Size(max = 10000) String texto,
        @Nullable List<UUID> procedimentosRealizados,
        @Nullable List<@Valid DadosDoProcedimento> novosProcedimentos) {

    List<UUID> planejadosRealizados() {
        return procedimentosRealizados == null ? List.of() : procedimentosRealizados;
    }

    List<DadosDoProcedimento> naoPlanejados() {
        return novosProcedimentos == null ? List.of() : novosProcedimentos;
    }

    @Override
    public String toString() {
        return "RegistroDeAtendimento[omitido]";
    }
}
