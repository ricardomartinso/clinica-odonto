package br.dev.ricardomartins.odonto.pacientes;

import br.dev.ricardomartins.odonto.pacientes.DadosDoPaciente.DadosEndereco;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
record Endereco(
        @Column(name = "endereco_cep") String cep,
        @Column(name = "endereco_logradouro") String logradouro,
        @Column(name = "endereco_numero") String numero,
        @Column(name = "endereco_complemento") String complemento,
        @Column(name = "endereco_bairro") String bairro,
        @Column(name = "endereco_cidade") String cidade,
        @Column(name = "endereco_uf") String uf) {

    /** Endereço totalmente em branco é tratado como ausente. */
    static Endereco de(DadosEndereco dados) {
        if (dados == null) {
            return null;
        }
        Endereco endereco = new Endereco(Textos.limpar(dados.cep()), Textos.limpar(dados.logradouro()),
                Textos.limpar(dados.numero()), Textos.limpar(dados.complemento()), Textos.limpar(dados.bairro()),
                Textos.limpar(dados.cidade()), Textos.limpar(dados.uf()));
        return endereco.equals(new Endereco(null, null, null, null, null, null, null)) ? null : endereco;
    }

    DadosEndereco paraDados() {
        return new DadosEndereco(cep, logradouro, numero, complemento, bairro, cidade, uf);
    }

    @Override
    public String toString() {
        return "Endereco[omitido]";
    }
}
