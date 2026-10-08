package br.dev.ricardomartins.odonto.pacientes;

import br.dev.ricardomartins.odonto.shared.Versoes;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
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
@RequestMapping("/api/pacientes")
class PacienteController {

    private final PacienteService service;

    PacienteController(PacienteService service) {
        this.service = service;
    }

    @PostMapping
    ResponseEntity<PacienteResponse> cadastrar(@Valid @RequestBody DadosDoPaciente dados,
            UriComponentsBuilder uri) {
        PacienteResponse paciente = service.cadastrar(dados);
        return ResponseEntity.created(uri.path("/api/pacientes/{id}").build(paciente.id()))
                .eTag(Versoes.etag(paciente.versao()))
                .body(paciente);
    }

    @GetMapping
    PagedModel<PacienteResumo> pesquisar(
            @RequestParam(required = false) String busca,
            @RequestParam(defaultValue = "false") boolean incluirInativos,
            @RequestParam(defaultValue = "0") @Min(0) int pagina,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int tamanho) {
        return new PagedModel<>(service.pesquisar(busca, incluirInativos, pagina, tamanho));
    }

    @GetMapping("/{id}")
    ResponseEntity<PacienteResponse> buscar(@PathVariable UUID id) {
        PacienteResponse paciente = service.buscar(id);
        return ResponseEntity.ok().eTag(Versoes.etag(paciente.versao())).body(paciente);
    }

    @PutMapping("/{id}")
    ResponseEntity<PacienteResponse> atualizar(@PathVariable UUID id,
            @RequestHeader(name = HttpHeaders.IF_MATCH, required = false) String ifMatch,
            @Valid @RequestBody DadosDoPaciente dados) {
        PacienteResponse paciente = service.atualizar(id, Versoes.exigidaDoIfMatch(ifMatch), dados);
        return ResponseEntity.ok().eTag(Versoes.etag(paciente.versao())).body(paciente);
    }

    @PostMapping("/{id}/inativar")
    ResponseEntity<Void> inativar(@PathVariable UUID id) {
        service.inativar(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/reativar")
    ResponseEntity<Void> reativar(@PathVariable UUID id) {
        service.reativar(id);
        return ResponseEntity.noContent().build();
    }
}
