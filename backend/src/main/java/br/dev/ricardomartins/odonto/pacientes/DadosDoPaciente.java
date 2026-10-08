package br.dev.ricardomartins.odonto.pacientes;

import br.dev.ricardomartins.odonto.shared.CpfValido;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/**
 * Dados cadastrais enviados na inclusão e na alteração. Documentos e telefones chegam apenas com dígitos;
 * a máscara é responsabilidade do cliente.
 */
public record DadosDoPaciente(
        @NotBlank @Size(max = 150) String nome,
        @Size(max = 150) String nomeSocial,
        @NotNull @PastOrPresent LocalDate dataNascimento,
        @CpfValido String cpf,
        @NotBlank @Pattern(regexp = TELEFONE, message = MENSAGEM_TELEFONE) String celular,
        @Email @Size(max = 254) String email,
        @Valid DadosEndereco endereco,
        @Valid DadosResponsavel responsavel,
        @Size(max = 2000) String observacoes) {

    static final String TELEFONE = "\\d{10,11}";
    static final String MENSAGEM_TELEFONE = "deve conter DDD e número, de 10 ou 11 dígitos, sem pontuação";

    public record DadosEndereco(
            @Pattern(regexp = "\\d{8}", message = "deve conter 8 dígitos, sem pontuação") String cep,
            @Size(max = 150) String logradouro,
            @Size(max = 20) String numero,
            @Size(max = 100) String complemento,
            @Size(max = 100) String bairro,
            @Size(max = 100) String cidade,
            @Pattern(regexp = "[A-Z]{2}", message = "deve ser a sigla da UF em maiúsculas") String uf) {

        @Override
        public String toString() {
            return "DadosEndereco[omitido]";
        }
    }

    public record DadosResponsavel(
            @NotBlank @Size(max = 150) String nome,
            @CpfValido String cpf,
            @NotBlank @Pattern(regexp = TELEFONE, message = MENSAGEM_TELEFONE) String telefone,
            @Size(max = 50) String parentesco) {

        @Override
        public String toString() {
            return "DadosResponsavel[omitido]";
        }
    }

    @Override
    public String toString() {
        return "DadosDoPaciente[omitido]";
    }
}
