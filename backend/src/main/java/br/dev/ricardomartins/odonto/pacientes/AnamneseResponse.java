package br.dev.ricardomartins.odonto.pacientes;

import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record AnamneseResponse(
        UUID pacienteId,
        DadosDaAnamnese respostas,
        List<AlertaClinico> alertas,
        Instant atualizadaEm,
        @JsonIgnore long versao) {

    static AnamneseResponse de(Anamnese anamnese) {
        return new AnamneseResponse(anamnese.getId(), anamnese.paraDados(), anamnese.alertas(),
                anamnese.getAtualizadoEm(), anamnese.getVersao());
    }

    @Override
    public String toString() {
        return "AnamneseResponse[pacienteId=" + pacienteId + "]";
    }
}
