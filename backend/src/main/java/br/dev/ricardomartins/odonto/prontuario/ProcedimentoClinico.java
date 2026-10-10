package br.dev.ricardomartins.odonto.prontuario;

import br.dev.ricardomartins.odonto.shared.Arcada;
import br.dev.ricardomartins.odonto.shared.Dente;
import br.dev.ricardomartins.odonto.shared.EntidadeBase;
import br.dev.ricardomartins.odonto.shared.Faces;
import br.dev.ricardomartins.odonto.shared.OperacaoNaoPermitidaException;
import br.dev.ricardomartins.odonto.shared.RegraDeNegocioException;
import br.dev.ricardomartins.odonto.shared.UuidV7;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.util.UUID;
import org.hibernate.envers.Audited;
import org.hibernate.envers.RelationTargetAuditMode;

/**
 * Procedimento de um paciente, do planejamento à realização. Só passa a {@link StatusProcedimento#REALIZADO}
 * dentro de uma evolução clínica, para que todo procedimento feito esteja documentado no prontuário.
 */
@Entity
@Table(name = "procedimento_clinico")
@Audited
class ProcedimentoClinico extends EntidadeBase {

    private UUID pacienteId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "procedimento_id")
    @Audited(targetAuditMode = RelationTargetAuditMode.NOT_AUDITED)
    private Procedimento procedimento;

    private Dente dente;

    private Faces faces;

    @Enumerated(EnumType.STRING)
    private Arcada arcada;

    @Enumerated(EnumType.STRING)
    private StatusProcedimento status;

    private String observacao;

    private UUID evolucaoId;

    private LocalDate realizadoEm;

    private UUID realizadoPor;

    private String motivo;

    protected ProcedimentoClinico() {
        // exigido pelo JPA
    }

    private ProcedimentoClinico(UUID pacienteId, Procedimento procedimento, Dente dente, Faces faces,
            Arcada arcada, String observacao) {
        super(UuidV7.gerar());
        if (!procedimento.isAtivo()) {
            throw new RegraDeNegocioException("Procedimento inativo no catálogo.");
        }
        exigirLocalizacaoCompativel(procedimento.getAbrangencia(), dente, faces, arcada);
        this.pacienteId = pacienteId;
        this.procedimento = procedimento;
        this.dente = dente;
        this.faces = faces;
        this.arcada = arcada;
        this.observacao = observacao;
        this.status = StatusProcedimento.PLANEJADO;
    }

    static ProcedimentoClinico planejar(UUID pacienteId, Procedimento procedimento, Dente dente, Faces faces,
            Arcada arcada, String observacao) {
        return new ProcedimentoClinico(pacienteId, procedimento, dente, faces, arcada, observacao);
    }

    void realizar(UUID evolucaoId, LocalDate data, UUID dentistaId) {
        if (status != StatusProcedimento.PLANEJADO) {
            throw new RegraDeNegocioException("Somente procedimentos planejados podem ser realizados.");
        }
        this.status = StatusProcedimento.REALIZADO;
        this.evolucaoId = evolucaoId;
        this.realizadoEm = data;
        this.realizadoPor = dentistaId;
    }

    void cancelar(String motivo) {
        if (status != StatusProcedimento.PLANEJADO) {
            throw new RegraDeNegocioException("Somente procedimentos planejados podem ser cancelados.");
        }
        this.status = StatusProcedimento.CANCELADO;
        this.motivo = motivo;
    }

    void anular(String motivo, UUID usuarioId) {
        if (realizadoPor != null && !realizadoPor.equals(usuarioId)) {
            throw new OperacaoNaoPermitidaException("Somente quem realizou o procedimento pode anulá-lo.");
        }
        if (status != StatusProcedimento.REALIZADO) {
            throw new RegraDeNegocioException("Somente procedimentos realizados podem ser anulados.");
        }
        this.status = StatusProcedimento.ANULADO;
        this.motivo = motivo;
    }

    private static void exigirLocalizacaoCompativel(Abrangencia abrangencia, Dente dente, Faces faces,
            Arcada arcada) {
        boolean temFaces = !faces.vazio();
        boolean valido = switch (abrangencia) {
            case FACE -> dente != null && temFaces && arcada == null;
            case DENTE -> dente != null && !temFaces && arcada == null;
            case ARCADA -> dente == null && !temFaces && arcada != null;
            case BOCA -> dente == null && !temFaces && arcada == null;
        };
        if (!valido) {
            throw new RegraDeNegocioException(switch (abrangencia) {
                case FACE -> "Este procedimento exige o dente e ao menos uma face.";
                case DENTE -> "Este procedimento exige o dente (sem faces).";
                case ARCADA -> "Este procedimento exige a arcada (sem dente).";
                case BOCA -> "Este procedimento é para a boca toda: não informe dente, faces ou arcada.";
            });
        }
    }

    /** Descrição legível do local: "16 · Mesial, Oclusal", "Dente 16", "Arcada superior", "Boca toda". */
    String local() {
        return switch (procedimento.getAbrangencia()) {
            case FACE -> dente.codigo() + " · " + String.join(", ",
                    faces.ordenadas().stream().map(face -> face.nomeNo(dente)).toList());
            case DENTE -> "Dente " + dente.codigo();
            case ARCADA -> arcada == Arcada.SUPERIOR ? "Arcada superior" : "Arcada inferior";
            case BOCA -> "Boca toda";
        };
    }

    UUID getPacienteId() {
        return pacienteId;
    }

    Procedimento getProcedimento() {
        return procedimento;
    }

    Dente getDente() {
        return dente;
    }

    Faces getFaces() {
        return faces;
    }

    Arcada getArcada() {
        return arcada;
    }

    StatusProcedimento getStatus() {
        return status;
    }

    String getObservacao() {
        return observacao;
    }

    UUID getEvolucaoId() {
        return evolucaoId;
    }

    LocalDate getRealizadoEm() {
        return realizadoEm;
    }

    String getMotivo() {
        return motivo;
    }
}
