package br.dev.ricardomartins.odonto.shared;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.envers.RevisionEntity;
import org.hibernate.envers.RevisionNumber;
import org.hibernate.envers.RevisionTimestamp;

/** Revisão do Hibernate Envers: registra quando e por quem cada alteração auditada foi feita. */
@Entity
@Table(name = "revisao")
@RevisionEntity(RevisaoListener.class)
public class Revisao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @RevisionNumber
    private Long id;

    @RevisionTimestamp
    private Instant momento;

    private UUID usuarioId;

    public Long getId() {
        return id;
    }

    public Instant getMomento() {
        return momento;
    }

    public UUID getUsuarioId() {
        return usuarioId;
    }

    void setUsuarioId(UUID usuarioId) {
        this.usuarioId = usuarioId;
    }
}
