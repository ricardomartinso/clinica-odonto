package br.dev.ricardomartins.odonto.prontuario;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;
import org.hibernate.annotations.Immutable;

/** Item do catálogo (dado de referência, carregado por migration). */
@Entity
@Table(name = "procedimento")
@Immutable
class Procedimento {

    @Id
    private UUID id;

    private String nome;

    @Enumerated(EnumType.STRING)
    private Abrangencia abrangencia;

    private boolean ativo;

    protected Procedimento() {
        // exigido pelo JPA
    }

    UUID getId() {
        return id;
    }

    String getNome() {
        return nome;
    }

    Abrangencia getAbrangencia() {
        return abrangencia;
    }

    boolean isAtivo() {
        return ativo;
    }

    @Override
    public String toString() {
        return "Procedimento[id=" + id + "]";
    }
}
