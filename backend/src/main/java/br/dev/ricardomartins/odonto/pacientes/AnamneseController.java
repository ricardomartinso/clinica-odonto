package br.dev.ricardomartins.odonto.pacientes;

import br.dev.ricardomartins.odonto.shared.Versoes;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/pacientes/{pacienteId}/anamnese")
class AnamneseController {

    private final AnamneseService service;

    AnamneseController(AnamneseService service) {
        this.service = service;
    }

    @GetMapping
    ResponseEntity<AnamneseResponse> buscar(@PathVariable UUID pacienteId) {
        AnamneseResponse anamnese = service.buscar(pacienteId);
        return ResponseEntity.ok().eTag(Versoes.etag(anamnese.versao())).body(anamnese);
    }

    /** 201 na primeira gravação; 200 nas seguintes (exigem If-Match). */
    @PutMapping
    ResponseEntity<AnamneseResponse> gravar(@PathVariable UUID pacienteId,
            @RequestHeader(name = HttpHeaders.IF_MATCH, required = false) String ifMatch,
            @Valid @RequestBody DadosDaAnamnese dados, HttpServletRequest request) {
        AnamneseService.Gravacao gravacao = service.gravar(pacienteId, Versoes.doIfMatch(ifMatch), dados);
        ResponseEntity.BodyBuilder resposta = gravacao.criada()
                ? ResponseEntity.status(HttpStatus.CREATED).location(URI.create(request.getRequestURI()))
                : ResponseEntity.ok();
        return resposta.eTag(Versoes.etag(gravacao.anamnese().versao())).body(gravacao.anamnese());
    }
}
