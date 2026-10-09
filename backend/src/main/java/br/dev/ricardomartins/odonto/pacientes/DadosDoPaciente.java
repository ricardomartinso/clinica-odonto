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
import org.springframework.lang.Nullable;

/**
 * Dados cadastrais enviados na inclusão e na alteração. Documentos e telefones chegam apenas com dígitos;
 * a máscara é responsabilidade do cliente.
 */
public record DadosDoPaciente(
        @NotBlank @Size(max = 150) String nome,
        @Size(max = 150) @Nullable String nomeSocial,
        @NotNull @PastOrPresent LocalDate dataNascimento,
        @CpfValido @Nullable String cpf,
        @NotBlank @Pattern(regexp = TELEFONE, message = MENSAGEM_TELEFONE) String celular,
        @Email @Size(max = 254) @Nullable String email,
        @Valid @Nullable DadosEndereco endereco,
        @Valid @Nullable DadosResponsavel responsavel,
        @Size(max = 2000) @Nullable String observacoes) {

    static final String TELEFONE = "\\d{10,11}";
    static final String MENSAGEM_TELEFONE = "deve conter DDD e número, de 10 ou 11 dígitos, sem pontuação";

    public record DadosEndereco(
            @Pattern(regexp = "\\d{8}", message = "deve conter 8 dígitos, sem pontuação") @Nullable String cep,
            @Size(max = 150) @Nullable String logradouro,
            @Size(max = 20) @Nullable String numero,
            @Size(max = 100) @Nullable String complemento,
            @Size(max = 100) @Nullable String bairro,
            @Size(max = 100) @Nullable String cidade,
            @Pattern(regexp = "[A-Z]{2}", message = "deve ser a sigla da UF em maiúsculas") @Nullable String uf) {

        @Override
        public String toString() {
            return "DadosEndereco[omitido]";
        }
    }

    public record DadosResponsavel(
            @NotBlank @Size(max = 150) String nome,
            @CpfValido @Nullable String cpf,
            @NotBlank @Pattern(regexp = TELEFONE, message = MENSAGEM_TELEFONE) String telefone,
            @Size(max = 50) @Nullable String parentesco) {

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
