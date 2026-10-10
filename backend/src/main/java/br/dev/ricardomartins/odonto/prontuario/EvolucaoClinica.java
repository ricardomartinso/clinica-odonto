package br.dev.ricardomartins.odonto.prontuario;

import br.dev.ricardomartins.odonto.shared.EntidadeBase;
import br.dev.ricardomartins.odonto.shared.OperacaoNaoPermitidaException;
import br.dev.ricardomartins.odonto.shared.RegraDeNegocioException;
import br.dev.ricardomartins.odonto.shared.UuidV7;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.hibernate.envers.Audited;

/**
 * Registro de um atendimento no prontuário. Editável apenas pelo autor (cada versão fica no Envers) e
 * nunca excluída: em caso de erro, é anulada com motivo e permanece visível.
 */
@Entity
@Table(name = "evolucao_clinica")
@Audited
class EvolucaoClinica extends EntidadeBase {

    private UUID pacienteId;

    private UUID autorId;

    private LocalDate dataAtendimento;

    private String texto;

    private Instant editadaEm;

    private Instant anuladaEm;

    private UUID anuladaPor;

    private String motivoAnulacao;

    protected EvolucaoClinica() {
        // exigido pelo JPA
    }

    EvolucaoClinica(UUID pacienteId, UUID autorId, LocalDate dataAtendimento, String texto, LocalDate hoje) {
        super(UuidV7.gerar());
        exigirDataValida(dataAtendimento, hoje);
        this.pacienteId = pacienteId;
        this.autorId = autorId;
        this.dataAtendimento = dataAtendimento;
        this.texto = texto.strip();
    }

    void editar(LocalDate dataAtendimento, String texto, UUID usuarioId, LocalDate hoje, Instant agora) {
        exigirAutorEmEvolucaoVigente(usuarioId, "editar");
        exigirDataValida(dataAtendimento, hoje);
        this.dataAtendimento = dataAtendimento;
        this.texto = texto.strip();
        this.editadaEm = agora;
    }

    void anular(String motivo, UUID usuarioId, Instant agora) {
        exigirAutorEmEvolucaoVigente(usuarioId, "anular");
        this.anuladaEm = agora;
        this.anuladaPor = usuarioId;
        this.motivoAnulacao = motivo.strip();
    }

    boolean anulada() {
        return anuladaEm != null;
    }

    private void exigirAutorEmEvolucaoVigente(UUID usuarioId, String acao) {
        if (!autorId.equals(usuarioId)) {
            throw new OperacaoNaoPermitidaException("Somente o autor pode " + acao + " esta evolução.");
        }
        if (anulada()) {
            throw new RegraDeNegocioException("Evolução anulada não pode ser alterada.");
        }
    }

    private static void exigirDataValida(LocalDate dataAtendimento, LocalDate hoje) {
        if (dataAtendimento.isAfter(hoje)) {
            throw new RegraDeNegocioException("A data do atendimento não pode estar no futuro.");
        }
    }

    UUID getPacienteId() {
        return pacienteId;
    }

    UUID getAutorId() {
        return autorId;
    }

    LocalDate getDataAtendimento() {
        return dataAtendimento;
    }

    String getTexto() {
        return texto;
    }

    Instant getEditadaEm() {
        return editadaEm;
    }

    Instant getAnuladaEm() {
        return anuladaEm;
    }

    UUID getAnuladaPor() {
        return anuladaPor;
    }

    String getMotivoAnulacao() {
        return motivoAnulacao;
    }
}
