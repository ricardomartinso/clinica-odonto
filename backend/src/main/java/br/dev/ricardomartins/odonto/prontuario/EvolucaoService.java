package br.dev.ricardomartins.odonto.prontuario;

import br.dev.ricardomartins.odonto.acesso.UsuarioService;
import br.dev.ricardomartins.odonto.pacientes.PacienteService;
import br.dev.ricardomartins.odonto.shared.RecursoNaoEncontradoException;
import br.dev.ricardomartins.odonto.shared.RegraDeNegocioException;
import br.dev.ricardomartins.odonto.shared.Revisao;
import br.dev.ricardomartins.odonto.shared.UsuarioIdentificado;
import br.dev.ricardomartins.odonto.shared.Versoes;
import jakarta.persistence.EntityManager;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.hibernate.envers.AuditReaderFactory;
import org.hibernate.envers.RevisionType;
import org.hibernate.envers.query.AuditEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Evoluções clínicas (registros de atendimento). Prontuário é restrito a dentistas. */
@Service
@Transactional
@PreAuthorize("hasRole('DENTISTA')")
public class EvolucaoService {

    private final EvolucaoClinicaRepository evolucoes;
    private final ProcedimentoClinicoRepository procedimentos;
    private final CatalogoDeProcedimentos fabrica;
    private final PacienteService pacientes;
    private final UsuarioService usuarios;
    private final EntityManager entityManager;
    private final Clock clock;

    EvolucaoService(EvolucaoClinicaRepository evolucoes, ProcedimentoClinicoRepository procedimentos,
            CatalogoDeProcedimentos fabrica, PacienteService pacientes, UsuarioService usuarios,
            EntityManager entityManager, Clock clock) {
        this.evolucoes = evolucoes;
        this.procedimentos = procedimentos;
        this.fabrica = fabrica;
        this.pacientes = pacientes;
        this.usuarios = usuarios;
        this.entityManager = entityManager;
        this.clock = clock;
    }

    /**
     * Registra o atendimento numa única transação: a evolução, a realização dos procedimentos planejados
     * informados e os procedimentos feitos sem planejamento. Qualquer inconsistência desfaz tudo.
     */
    public EvolucaoResponse registrar(UUID pacienteId, RegistroDeAtendimento registro) {
        exigirPacienteAtivo(pacienteId);
        UUID dentista = usuarioAtual();
        EvolucaoClinica evolucao = evolucoes.save(new EvolucaoClinica(pacienteId, dentista,
                registro.dataAtendimento(), registro.texto(), hoje()));

        List<ProcedimentoClinico> realizados = new ArrayList<>();
        registro.planejadosRealizados().forEach(id -> realizados.add(procedimentoDoPaciente(pacienteId, id)));
        registro.naoPlanejados().forEach(dados -> realizados.add(fabrica.planejar(pacienteId, dados)));
        realizados.forEach(p -> p.realizar(evolucao.getId(), evolucao.getDataAtendimento(), dentista));
        procedimentos.saveAll(realizados);
        evolucoes.flush();
        return montar(evolucao);
    }

    @Transactional(readOnly = true)
    public Page<EvolucaoResponse> listar(UUID pacienteId, int pagina, int tamanho) {
        pacientes.buscar(pacienteId);
        Page<EvolucaoClinica> resultado = evolucoes
                .findByPacienteIdOrderByDataAtendimentoDescCriadoEmDesc(pacienteId, PageRequest.of(pagina, tamanho));
        List<UUID> ids = resultado.map(EvolucaoClinica::getId).toList();
        Map<UUID, List<ProcedimentoClinicoResponse>> porEvolucao = ids.isEmpty() ? Map.of()
                : procedimentos.realizadosNas(ids).stream().collect(Collectors.groupingBy(
                        ProcedimentoClinico::getEvolucaoId,
                        Collectors.mapping(ProcedimentoClinicoResponse::de, Collectors.toList())));
        Map<UUID, String> nomes = usuarios.nomes(pessoasEnvolvidas(resultado.getContent()));
        return resultado.map(e -> EvolucaoResponse.de(e, porEvolucao.getOrDefault(e.getId(), List.of()), nomes));
    }

    @Transactional(readOnly = true)
    public EvolucaoResponse buscar(UUID pacienteId, UUID id) {
        return montar(carregar(pacienteId, id));
    }

    public EvolucaoResponse editar(UUID pacienteId, UUID id, long versaoEsperada, EdicaoDeEvolucao edicao) {
        EvolucaoClinica evolucao = carregar(pacienteId, id);
        Versoes.conferir(evolucao.getVersao(), versaoEsperada);
        evolucao.editar(edicao.dataAtendimento(), edicao.texto(), usuarioAtual(), hoje(), Instant.now(clock));
        evolucoes.flush();
        return montar(evolucao);
    }

    /** Anula a evolução e, em cascata, os procedimentos realizados nela (mesmo motivo). */
    public EvolucaoResponse anular(UUID pacienteId, UUID id, Justificativa justificativa) {
        EvolucaoClinica evolucao = carregar(pacienteId, id);
        UUID usuario = usuarioAtual();
        String motivo = justificativa.motivo().strip();
        evolucao.anular(motivo, usuario, Instant.now(clock));
        procedimentos.realizadosNas(List.of(id)).stream()
                .filter(p -> p.getStatus() == StatusProcedimento.REALIZADO)
                .forEach(p -> p.anular(motivo, usuario));
        evolucoes.flush();
        return montar(evolucao);
    }

    /** Todas as versões da evolução registradas pelo Envers, da criação à mais recente. */
    @Transactional(readOnly = true)
    public List<VersaoDaEvolucao> historico(UUID pacienteId, UUID id) {
        carregar(pacienteId, id);
        @SuppressWarnings("unchecked")
        List<Object[]> revisoes = AuditReaderFactory.get(entityManager).createQuery()
                .forRevisionsOfEntity(EvolucaoClinica.class, false, true)
                .add(AuditEntity.id().eq(id))
                .addOrder(AuditEntity.revisionNumber().asc())
                .getResultList();

        Map<UUID, String> nomes = usuarios.nomes(revisoes.stream()
                .map(r -> ((Revisao) r[1]).getUsuarioId())
                .filter(Objects::nonNull)
                .collect(Collectors.toSet()));
        return revisoes.stream().map(r -> {
            EvolucaoClinica versao = (EvolucaoClinica) r[0];
            Revisao revisao = (Revisao) r[1];
            VersaoDaEvolucao.TipoDeAlteracao tipo = r[2] == RevisionType.ADD
                    ? VersaoDaEvolucao.TipoDeAlteracao.CRIACAO
                    : versao.anulada() ? VersaoDaEvolucao.TipoDeAlteracao.ANULACAO
                    : VersaoDaEvolucao.TipoDeAlteracao.EDICAO;
            return new VersaoDaEvolucao(revisao.getId(), revisao.getMomento(),
                    EvolucaoResponse.autor(revisao.getUsuarioId(), nomes), tipo, versao.getDataAtendimento(),
                    versao.getTexto());
        }).toList();
    }

    private EvolucaoResponse montar(EvolucaoClinica evolucao) {
        List<ProcedimentoClinicoResponse> realizados = procedimentos.realizadosNas(List.of(evolucao.getId()))
                .stream().map(ProcedimentoClinicoResponse::de).toList();
        return EvolucaoResponse.de(evolucao, realizados, usuarios.nomes(pessoasEnvolvidas(List.of(evolucao))));
    }

    private static Set<UUID> pessoasEnvolvidas(List<EvolucaoClinica> lista) {
        Set<UUID> ids = new HashSet<>();
        lista.forEach(e -> {
            ids.add(e.getAutorId());
            if (e.getAnuladaPor() != null) {
                ids.add(e.getAnuladaPor());
            }
        });
        return ids;
    }

    private EvolucaoClinica carregar(UUID pacienteId, UUID id) {
        return evolucoes.findById(id)
                .filter(e -> e.getPacienteId().equals(pacienteId))
                .orElseThrow(() -> new RecursoNaoEncontradoException("Evolução não encontrada."));
    }

    private ProcedimentoClinico procedimentoDoPaciente(UUID pacienteId, UUID id) {
        return procedimentos.findById(id)
                .filter(p -> p.getPacienteId().equals(pacienteId))
                .orElseThrow(() -> new RegraDeNegocioException("Procedimento planejado não encontrado para este paciente."));
    }

    private void exigirPacienteAtivo(UUID pacienteId) {
        if (!pacientes.buscar(pacienteId).ativo()) {
            throw new RegraDeNegocioException("Paciente inativo. Reative o cadastro antes de alterar o prontuário.");
        }
    }

    private static UUID usuarioAtual() {
        return UsuarioIdentificado.atual().orElseThrow();
    }

    private LocalDate hoje() {
        return LocalDate.now(clock);
    }
}
