package br.dev.ricardomartins.odonto.prontuario;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * Vários procedimentos planejados de uma vez (ex.: selante em 16, 26, 36 e 46; clareamento nas duas
 * arcadas). Tudo ou nada: um item inválido não deixa o plano pela metade.
 */
public record PlanejamentoEmLote(@NotEmpty @Size(max = 64) List<@Valid DadosDoProcedimento> procedimentos) {
}
