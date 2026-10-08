package br.dev.ricardomartins.odonto.pacientes;

import br.dev.ricardomartins.odonto.shared.Cpf;
import br.dev.ricardomartins.odonto.shared.EntidadeBase;
import br.dev.ricardomartins.odonto.shared.RegraDeNegocioException;
import br.dev.ricardomartins.odonto.shared.UuidV7;
import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.Period;
import java.util.Locale;

@Entity
@Table(name = "paciente")
class Paciente extends EntidadeBase {

    private static final int MAIORIDADE = 18;

    private String nome;

    private String nomeSocial;

    private LocalDate dataNascimento;

    private Cpf cpf;

    private String celular;

    private String email;

    @Embedded
    private Endereco endereco;

    @Embedded
    private Responsavel responsavel;

    private String observacoes;

    private boolean ativo;

    /** Coluna gerada pelo banco (nome sem acento), usada apenas em consultas. */
    @Column(insertable = false, updatable = false)
    private String nomeBusca;

    protected Paciente() {
        // exigido pelo JPA
    }

    private Paciente(DadosDoPaciente dados, LocalDate hoje) {
        super(UuidV7.gerar());
        this.ativo = true;
        aplicar(dados, hoje);
    }

    static Paciente cadastrar(DadosDoPaciente dados, LocalDate hoje) {
        return new Paciente(dados, hoje);
    }

    void atualizar(DadosDoPaciente dados, LocalDate hoje) {
        exigirAtivo();
        aplicar(dados, hoje);
    }

    void inativar() {
        ativo = false;
    }

    void reativar() {
        ativo = true;
    }

    void exigirAtivo() {
        if (!ativo) {
            throw new RegraDeNegocioException("Paciente inativo. Reative o cadastro antes de alterá-lo.");
        }
    }

    boolean ehMenorDeIdadeEm(LocalDate data) {
        return Period.between(dataNascimento, data).getYears() < MAIORIDADE;
    }

    private void aplicar(DadosDoPaciente dados, LocalDate hoje) {
        this.nome = dados.nome().strip();
        this.nomeSocial = Textos.limpar(dados.nomeSocial());
        this.dataNascimento = dados.dataNascimento();
        this.cpf = dados.cpf() == null ? null : new Cpf(dados.cpf());
        this.celular = dados.celular();
        this.email = dados.email() == null ? null : Textos.limpar(dados.email().toLowerCase(Locale.ROOT));
        this.endereco = Endereco.de(dados.endereco());
        this.responsavel = Responsavel.de(dados.responsavel());
        this.observacoes = Textos.limpar(dados.observacoes());

        if (responsavel == null && ehMenorDeIdadeEm(hoje)) {
            throw new RegraDeNegocioException("Paciente menor de 18 anos exige responsável legal.");
        }
    }

    String getNome() {
        return nome;
    }

    String getNomeSocial() {
        return nomeSocial;
    }

    LocalDate getDataNascimento() {
        return dataNascimento;
    }

    Cpf getCpf() {
        return cpf;
    }

    String getCelular() {
        return celular;
    }

    String getEmail() {
        return email;
    }

    Endereco getEndereco() {
        return endereco;
    }

    Responsavel getResponsavel() {
        return responsavel;
    }

    String getObservacoes() {
        return observacoes;
    }

    boolean isAtivo() {
        return ativo;
    }
}
