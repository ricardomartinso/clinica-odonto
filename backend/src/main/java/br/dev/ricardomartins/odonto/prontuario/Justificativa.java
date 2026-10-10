package br.dev.ricardomartins.odonto.prontuario;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Motivo exigido para cancelar ou anular registros clínicos. */
public record Justificativa(@NotBlank @Size(max = 500) String motivo) {
}
