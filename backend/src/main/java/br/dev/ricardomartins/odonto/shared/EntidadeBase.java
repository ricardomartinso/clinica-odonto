package br.dev.ricardomartins.odonto.shared;

import jakarta.persistence.Column;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.Id;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import org.hibernate.Hibernate;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * Base das entidades: ID atribuído na criação (não pelo banco), versão para lock otimista e colunas de
 * auditoria preenchidas pelo Spring Data. Como o ID já existe antes de persistir, o Spring Data usa
 * {@code versao == null} para decidir que a entidade é nova.
 */
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class EntidadeBase {

    @Id
    private UUID id;

    @Version
    private Long versao;

    @CreatedDate
    @Column(updatable = false)
    private Instant criadoEm;

    @CreatedBy
    @Column(updatable = false)
    private UUID criadoPor;

    @LastModifiedDate
    private Instant atualizadoEm;

    @LastModifiedBy
    private UUID atualizadoPor;

    protected EntidadeBase() {
        // exigido pelo JPA
    }

    protected EntidadeBase(UUID id) {
        this.id = Objects.requireNonNull(id);
    }

    public UUID getId() {
        return id;
    }

    public Long getVersao() {
        return versao;
    }

    public Instant getCriadoEm() {
        return criadoEm;
    }

    public Instant getAtualizadoEm() {
        return atualizadoEm;
    }

    @Override
    public final boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof EntidadeBase outra) || Hibernate.getClass(this) != Hibernate.getClass(outra)) {
            return false;
        }
        return id != null && id.equals(outra.id);
    }

    @Override
    public final int hashCode() {
        return Objects.hashCode(id);
    }

    /** Nunca inclui atributos: entidades podem carregar dados pessoais. */
    @Override
    public String toString() {
        return Hibernate.getClass(this).getSimpleName() + "[id=" + id + "]";
    }
}
