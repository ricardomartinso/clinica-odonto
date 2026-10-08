package br.dev.ricardomartins.odonto.acesso;

import br.dev.ricardomartins.odonto.shared.EntidadeBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

@Entity
@Table(name = "usuario")
class Usuario extends EntidadeBase {

    private String nome;

    private String email;

    @Column(name = "senha_hash")
    private String senhaHash;

    @Enumerated(EnumType.STRING)
    private Papel papel;

    private String croNumero;

    private String croUf;

    private boolean ativo;

    protected Usuario() {
        // exigido pelo JPA
    }

    String getNome() {
        return nome;
    }

    String getEmail() {
        return email;
    }

    String getSenhaHash() {
        return senhaHash;
    }

    Papel getPapel() {
        return papel;
    }

    boolean isAtivo() {
        return ativo;
    }
}
