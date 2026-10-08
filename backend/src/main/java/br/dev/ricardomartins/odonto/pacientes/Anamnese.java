package br.dev.ricardomartins.odonto.pacientes;

import br.dev.ricardomartins.odonto.shared.EntidadeBase;
import br.dev.ricardomartins.odonto.shared.RegraDeNegocioException;
import jakarta.persistence.AttributeOverride;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.hibernate.envers.Audited;

/** Anamnese atual do paciente (1:1, mesmo ID). O histórico de alterações fica no Envers. */
@Entity
@Table(name = "anamnese")
@AttributeOverride(name = "id", column = @Column(name = "paciente_id"))
@Audited
class Anamnese extends EntidadeBase {

    private Boolean alergico;
    private String alergiasDescricao;
    private Boolean usaAnticoagulante;
    private Boolean diabetes;
    private Boolean hipertensao;
    private Boolean cardiopatia;
    private Boolean coagulopatia;
    private Boolean gestante;
    private Integer semanasGestacao;
    private Boolean fumante;
    private Boolean usaBisfosfonatos;
    private Boolean reacaoAnestesia;
    private String medicamentosEmUso;
    private String observacoes;

    protected Anamnese() {
        // exigido pelo JPA
    }

    Anamnese(UUID pacienteId, DadosDaAnamnese dados) {
        super(pacienteId);
        registrar(dados);
    }

    void registrar(DadosDaAnamnese dados) {
        String descricaoAlergias = Textos.limpar(dados.alergiasDescricao());
        if (Boolean.TRUE.equals(dados.alergico()) && descricaoAlergias == null) {
            throw new RegraDeNegocioException("Informe a quais substâncias o paciente é alérgico.");
        }
        if (Boolean.TRUE.equals(dados.gestante()) != (dados.semanasGestacao() != null)) {
            throw new RegraDeNegocioException("Semanas de gestação devem ser informadas somente para gestantes.");
        }
        this.alergico = dados.alergico();
        this.alergiasDescricao = descricaoAlergias;
        this.usaAnticoagulante = dados.usaAnticoagulante();
        this.diabetes = dados.diabetes();
        this.hipertensao = dados.hipertensao();
        this.cardiopatia = dados.cardiopatia();
        this.coagulopatia = dados.coagulopatia();
        this.gestante = dados.gestante();
        this.semanasGestacao = dados.semanasGestacao();
        this.fumante = dados.fumante();
        this.usaBisfosfonatos = dados.usaBisfosfonatos();
        this.reacaoAnestesia = dados.reacaoAnestesia();
        this.medicamentosEmUso = Textos.limpar(dados.medicamentosEmUso());
        this.observacoes = Textos.limpar(dados.observacoes());
    }

    List<AlertaClinico> alertas() {
        List<AlertaClinico> alertas = new ArrayList<>();
        adicionarSe(alertas, alergico, AlertaClinico.ALERGIA);
        adicionarSe(alertas, usaAnticoagulante, AlertaClinico.ANTICOAGULANTE);
        adicionarSe(alertas, diabetes, AlertaClinico.DIABETES);
        adicionarSe(alertas, hipertensao, AlertaClinico.HIPERTENSAO);
        adicionarSe(alertas, cardiopatia, AlertaClinico.CARDIOPATIA);
        adicionarSe(alertas, coagulopatia, AlertaClinico.COAGULOPATIA);
        adicionarSe(alertas, gestante, AlertaClinico.GESTANTE);
        adicionarSe(alertas, usaBisfosfonatos, AlertaClinico.BISFOSFONATOS);
        adicionarSe(alertas, reacaoAnestesia, AlertaClinico.REACAO_ANESTESIA);
        return List.copyOf(alertas);
    }

    private static void adicionarSe(List<AlertaClinico> alertas, Boolean resposta, AlertaClinico alerta) {
        if (Boolean.TRUE.equals(resposta)) {
            alertas.add(alerta);
        }
    }

    DadosDaAnamnese paraDados() {
        return new DadosDaAnamnese(alergico, alergiasDescricao, usaAnticoagulante, diabetes, hipertensao,
                cardiopatia, coagulopatia, gestante, semanasGestacao, fumante, usaBisfosfonatos, reacaoAnestesia,
                medicamentosEmUso, observacoes);
    }
}
