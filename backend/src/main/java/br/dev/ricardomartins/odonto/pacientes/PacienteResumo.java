package br.dev.ricardomartins.odonto.pacientes;

import java.time.LocalDate;
import java.util.UUID;

/** Item da listagem: só o necessário para identificar o paciente, com CPF mascarado e sem contatos. */
public record PacienteResumo(
        UUID id,
        String nome,
        String nomeSocial,
        LocalDate dataNascimento,
        String cpfMascarado,
        boolean ativo) {

    static PacienteResumo de(Paciente paciente) {
        return new PacienteResumo(
                paciente.getId(),
                paciente.getNome(),
                paciente.getNomeSocial(),
                paciente.getDataNascimento(),
                paciente.getCpf() == null ? null : paciente.getCpf().mascarado(),
                paciente.isAtivo());
    }

    @Override
    public String toString() {
        return "PacienteResumo[id=" + id + "]";
    }
}
