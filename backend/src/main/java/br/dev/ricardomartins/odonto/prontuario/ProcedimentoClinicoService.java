package br.dev.ricardomartins.odonto.prontuario;

import br.dev.ricardomartins.odonto.pacientes.PacienteService;
import br.dev.ricardomartins.odonto.shared.RecursoNaoEncontradoException;
import br.dev.ricardomartins.odonto.shared.RegraDeNegocioException;
import br.dev.ricardomartins.odonto.shared.UsuarioIdentificado;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Plano de tratamento e catálogo. Prontuário é restrito a dentistas. */
@Service
@Transactional
@PreAuthorize("hasRole('DENTISTA')")
public class ProcedimentoClinicoService {

    private final ProcedimentoRepository catalogo;
    private final ProcedimentoClinicoRepository procedimentos;
    private final CatalogoDeProcedimentos fabrica;
    private final PacienteService pacientes;

    ProcedimentoClinicoService(ProcedimentoRepository catalogo, ProcedimentoClinicoRepository procedimentos,
            CatalogoDeProcedimentos fabrica, PacienteService pacientes) {
        this.catalogo = catalogo;
        this.procedimentos = procedimentos;
        this.fabrica = fabrica;
        this.pacientes = pacientes;
    }

    @Transactional(readOnly = true)
    public List<ProcedimentoDoCatalogo> catalogo() {
        return catalogo.findByAtivoTrueOrderByNome().stream().map(ProcedimentoDoCatalogo::de).toList();
    }

    @Transactional(readOnly = true)
    public List<ProcedimentoClinicoResponse> listar(UUID pacienteId, Set<StatusProcedimento> status) {
        pacientes.buscar(pacienteId);
        Set<StatusProcedimento> filtro = status == null || status.isEmpty()
                ? EnumSet.allOf(StatusProcedimento.class) : status;
        return procedimentos.listar(pacienteId, filtro).stream().map(ProcedimentoClinicoResponse::de).toList();
    }

    public ProcedimentoClinicoResponse planejar(UUID pacienteId, DadosDoProcedimento dados) {
        exigirPacienteAtivo(pacienteId);
        ProcedimentoClinico procedimento = procedimentos.saveAndFlush(fabrica.planejar(pacienteId, dados));
        return ProcedimentoClinicoResponse.de(procedimento);
    }

    public ProcedimentoClinicoResponse cancelar(UUID pacienteId, UUID id, Justificativa justificativa) {
        ProcedimentoClinico procedimento = carregar(pacienteId, id);
        procedimento.cancelar(justificativa.motivo().strip());
        procedimentos.flush();
        return ProcedimentoClinicoResponse.de(procedimento);
    }

    public ProcedimentoClinicoResponse anular(UUID pacienteId, UUID id, Justificativa justificativa) {
        ProcedimentoClinico procedimento = carregar(pacienteId, id);
        procedimento.anular(justificativa.motivo().strip(), UsuarioIdentificado.atual().orElseThrow());
        procedimentos.flush();
        return ProcedimentoClinicoResponse.de(procedimento);
    }

    private ProcedimentoClinico carregar(UUID pacienteId, UUID id) {
        return procedimentos.findById(id)
                .filter(p -> p.getPacienteId().equals(pacienteId))
                .orElseThrow(() -> new RecursoNaoEncontradoException("Procedimento não encontrado."));
    }

    private void exigirPacienteAtivo(UUID pacienteId) {
        if (!pacientes.buscar(pacienteId).ativo()) {
            throw new RegraDeNegocioException("Paciente inativo. Reative o cadastro antes de alterar o prontuário.");
        }
    }
}
