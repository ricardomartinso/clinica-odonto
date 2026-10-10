package br.dev.ricardomartins.odonto.prontuario;

import br.dev.ricardomartins.odonto.shared.Versoes;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.List;
import java.util.UUID;
import org.springframework.data.web.PagedModel;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriComponentsBuilder;

@RestController
@RequestMapping("/api/pacientes/{pacienteId}/evolucoes")
class EvolucaoController {

    private final EvolucaoService service;

    EvolucaoController(EvolucaoService service) {
        this.service = service;
    }

    /** Linha do tempo, da mais recente para a mais antiga. */
    @GetMapping
    PagedModel<EvolucaoResponse> listar(@PathVariable UUID pacienteId,
            @RequestParam(defaultValue = "0") @Min(0) int pagina,
            @RequestParam(defaultValue = "10") @Min(1) @Max(50) int tamanho) {
        return new PagedModel<>(service.listar(pacienteId, pagina, tamanho));
    }

    @PostMapping
    ResponseEntity<EvolucaoResponse> registrar(@PathVariable UUID pacienteId,
            @Valid @RequestBody RegistroDeAtendimento registro, UriComponentsBuilder uri) {
        EvolucaoResponse evolucao = service.registrar(pacienteId, registro);
        return ResponseEntity
                .created(uri.path("/api/pacientes/{pacienteId}/evolucoes/{id}").build(pacienteId, evolucao.id()))
                .eTag(Versoes.etag(evolucao.versao()))
                .body(evolucao);
    }

    @GetMapping("/{id}")
    ResponseEntity<EvolucaoResponse> buscar(@PathVariable UUID pacienteId, @PathVariable UUID id) {
        EvolucaoResponse evolucao = service.buscar(pacienteId, id);
        return ResponseEntity.ok().eTag(Versoes.etag(evolucao.versao())).body(evolucao);
    }

    @PutMapping("/{id}")
    ResponseEntity<EvolucaoResponse> editar(@PathVariable UUID pacienteId, @PathVariable UUID id,
            @RequestHeader(name = HttpHeaders.IF_MATCH, required = false) String ifMatch,
            @Valid @RequestBody EdicaoDeEvolucao edicao) {
        EvolucaoResponse evolucao = service.editar(pacienteId, id, Versoes.exigidaDoIfMatch(ifMatch), edicao);
        return ResponseEntity.ok().eTag(Versoes.etag(evolucao.versao())).body(evolucao);
    }

    @PostMapping("/{id}/anular")
    EvolucaoResponse anular(@PathVariable UUID pacienteId, @PathVariable UUID id,
            @Valid @RequestBody Justificativa justificativa) {
        return service.anular(pacienteId, id, justificativa);
    }

    @GetMapping("/{id}/historico")
    List<VersaoDaEvolucao> historico(@PathVariable UUID pacienteId, @PathVariable UUID id) {
        return service.historico(pacienteId, id);
    }
}
