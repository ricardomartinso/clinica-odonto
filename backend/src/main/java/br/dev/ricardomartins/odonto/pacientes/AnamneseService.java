package br.dev.ricardomartins.odonto.pacientes;

import br.dev.ricardomartins.odonto.shared.RecursoNaoEncontradoException;
import br.dev.ricardomartins.odonto.shared.VersaoDesatualizadaException;
import br.dev.ricardomartins.odonto.shared.VersaoObrigatoriaException;
import br.dev.ricardomartins.odonto.shared.Versoes;
import java.util.Optional;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Dados de saúde: acesso restrito a dentistas. */
@Service
@Transactional
@PreAuthorize("hasRole('DENTISTA')")
public class AnamneseService {

    public record Gravacao(AnamneseResponse anamnese, boolean criada) {
    }

    private final AnamneseRepository anamneses;
    private final PacienteRepository pacientes;

    AnamneseService(AnamneseRepository anamneses, PacienteRepository pacientes) {
        this.anamneses = anamneses;
        this.pacientes = pacientes;
    }

    @Transactional(readOnly = true)
    public AnamneseResponse buscar(UUID pacienteId) {
        carregarPaciente(pacienteId);
        return anamneses.findById(pacienteId)
                .map(AnamneseResponse::de)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Anamnese ainda não registrada para este paciente."));
    }

    /**
     * Cria a anamnese ou substitui as respostas da atual (semântica de PUT). Na criação não pode haver
     * versão esperada; na alteração ela é obrigatória e precisa ser a atual.
     */
    public Gravacao gravar(UUID pacienteId, Optional<Long> versaoEsperada, DadosDaAnamnese dados) {
        carregarPaciente(pacienteId).exigirAtivo();
        Optional<Anamnese> existente = anamneses.findById(pacienteId);

        if (existente.isEmpty()) {
            if (versaoEsperada.isPresent()) {
                throw new VersaoDesatualizadaException();
            }
            Anamnese criada = anamneses.saveAndFlush(new Anamnese(pacienteId, dados));
            return new Gravacao(AnamneseResponse.de(criada), true);
        }

        Anamnese anamnese = existente.get();
        Versoes.conferir(anamnese.getVersao(), versaoEsperada.orElseThrow(VersaoObrigatoriaException::new));
        anamnese.registrar(dados);
        anamneses.flush();
        return new Gravacao(AnamneseResponse.de(anamnese), false);
    }

    private Paciente carregarPaciente(UUID pacienteId) {
        return pacientes.findById(pacienteId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Paciente não encontrado."));
    }
}
