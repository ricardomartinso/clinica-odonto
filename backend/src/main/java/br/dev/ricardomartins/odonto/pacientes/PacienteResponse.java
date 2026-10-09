package br.dev.ricardomartins.odonto.pacientes;

import br.dev.ricardomartins.odonto.pacientes.DadosDoPaciente.DadosEndereco;
import br.dev.ricardomartins.odonto.pacientes.DadosDoPaciente.DadosResponsavel;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.lang.Nullable;

/** Detalhe do paciente. A anamnese não vem aqui: tem endpoint e permissão próprios. */
public record PacienteResponse(
        UUID id,
        String nome,
        @Nullable String nomeSocial,
        LocalDate dataNascimento,
        @Nullable String cpf,
        String celular,
        @Nullable String email,
        @Nullable DadosEndereco endereco,
        @Nullable DadosResponsavel responsavel,
        @Nullable String observacoes,
        boolean ativo,
        Instant criadoEm,
        Instant atualizadoEm,
        @JsonIgnore long versao) {

    static PacienteResponse de(Paciente paciente) {
        return new PacienteResponse(
                paciente.getId(),
                paciente.getNome(),
                paciente.getNomeSocial(),
                paciente.getDataNascimento(),
                paciente.getCpf() == null ? null : paciente.getCpf().digitos(),
                paciente.getCelular(),
                paciente.getEmail(),
                paciente.getEndereco() == null ? null : paciente.getEndereco().paraDados(),
                paciente.getResponsavel() == null ? null : paciente.getResponsavel().paraDados(),
                paciente.getObservacoes(),
                paciente.isAtivo(),
                paciente.getCriadoEm(),
                paciente.getAtualizadoEm(),
                paciente.getVersao());
    }

    @Override
    public String toString() {
        return "PacienteResponse[id=" + id + "]";
    }
}
