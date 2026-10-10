package br.dev.ricardomartins.odonto.prontuario;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record EdicaoDeEvolucao(
        @NotNull LocalDate dataAtendimento,
        @NotBlank @Size(max = 10000) String texto) {

    @Override
    public String toString() {
        return "EdicaoDeEvolucao[omitido]";
    }
}
