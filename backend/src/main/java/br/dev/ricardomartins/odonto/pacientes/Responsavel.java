package br.dev.ricardomartins.odonto.pacientes;

import br.dev.ricardomartins.odonto.pacientes.DadosDoPaciente.DadosResponsavel;
import br.dev.ricardomartins.odonto.shared.Cpf;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

/** Responsável legal, obrigatório para pacientes menores de idade. */
@Embeddable
record Responsavel(
        @Column(name = "responsavel_nome") String nome,
        @Column(name = "responsavel_cpf") Cpf cpf,
        @Column(name = "responsavel_telefone") String telefone,
        @Column(name = "responsavel_parentesco") String parentesco) {

    static Responsavel de(DadosResponsavel dados) {
        if (dados == null) {
            return null;
        }
        return new Responsavel(dados.nome().strip(), dados.cpf() == null ? null : new Cpf(dados.cpf()),
                dados.telefone(), Textos.limpar(dados.parentesco()));
    }

    DadosResponsavel paraDados() {
        return new DadosResponsavel(nome, cpf == null ? null : cpf.digitos(), telefone, parentesco);
    }

    @Override
    public String toString() {
        return "Responsavel[omitido]";
    }
}
