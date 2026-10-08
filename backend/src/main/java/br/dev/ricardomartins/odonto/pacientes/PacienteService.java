package br.dev.ricardomartins.odonto.pacientes;

import br.dev.ricardomartins.odonto.shared.ConflitoException;
import br.dev.ricardomartins.odonto.shared.Cpf;
import br.dev.ricardomartins.odonto.shared.RecursoNaoEncontradoException;
import br.dev.ricardomartins.odonto.shared.Versoes;
import java.text.Normalizer;
import java.time.Clock;
import java.time.LocalDate;
import java.util.Locale;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** API pública do módulo de pacientes (cadastro). */
@Service
@Transactional
public class PacienteService {

    private static final Sort ORDEM_ALFABETICA = Sort.by("nome", "id");

    private final PacienteRepository pacientes;
    private final Clock clock;

    PacienteService(PacienteRepository pacientes, Clock clock) {
        this.pacientes = pacientes;
        this.clock = clock;
    }

    public PacienteResponse cadastrar(DadosDoPaciente dados) {
        if (dados.cpf() != null && pacientes.existsByCpf(new Cpf(dados.cpf()))) {
            throw cpfDuplicado();
        }
        Paciente paciente = pacientes.saveAndFlush(Paciente.cadastrar(dados, hoje()));
        return PacienteResponse.de(paciente);
    }

    @Transactional(readOnly = true)
    public PacienteResponse buscar(UUID id) {
        return PacienteResponse.de(carregar(id));
    }

    /**
     * Busca por CPF exato quando o termo tem 11 dígitos; caso contrário, por trecho do nome ou nome social,
     * sem diferenciar acentos e maiúsculas. Sem termo, lista todos.
     */
    @Transactional(readOnly = true)
    public Page<PacienteResumo> pesquisar(String termo, boolean incluirInativos, int pagina, int tamanho) {
        String busca = Textos.limpar(termo);
        Cpf cpf = busca != null && Cpf.valido(busca) ? new Cpf(busca) : null;
        String padraoNome = busca != null && cpf == null ? padraoLike(busca) : null;
        return pacientes.pesquisar(padraoNome, cpf, incluirInativos, PageRequest.of(pagina, tamanho, ORDEM_ALFABETICA))
                .map(PacienteResumo::de);
    }

    public PacienteResponse atualizar(UUID id, long versaoEsperada, DadosDoPaciente dados) {
        Paciente paciente = carregar(id);
        Versoes.conferir(paciente.getVersao(), versaoEsperada);
        if (dados.cpf() != null && pacientes.existsByCpfAndIdNot(new Cpf(dados.cpf()), id)) {
            throw cpfDuplicado();
        }
        paciente.atualizar(dados, hoje());
        // flush para que versão e data de atualização da resposta já reflitam esta alteração
        pacientes.flush();
        return PacienteResponse.de(paciente);
    }

    public void inativar(UUID id) {
        carregar(id).inativar();
    }

    public void reativar(UUID id) {
        carregar(id).reativar();
    }

    private Paciente carregar(UUID id) {
        return pacientes.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Paciente não encontrado."));
    }

    private LocalDate hoje() {
        return LocalDate.now(clock);
    }

    private static ConflitoException cpfDuplicado() {
        return new ConflitoException("Já existe um paciente cadastrado com este CPF.");
    }

    /** Mesma normalização da coluna nome_busca; curingas digitados pelo usuário são tratados como texto. */
    private static String padraoLike(String termo) {
        String semAcento = Normalizer.normalize(termo.toLowerCase(Locale.ROOT), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        String escapado = semAcento.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
        return "%" + escapado + "%";
    }
}
