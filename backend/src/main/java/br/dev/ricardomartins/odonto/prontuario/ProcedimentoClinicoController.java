package br.dev.ricardomartins.odonto.prontuario;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
class ProcedimentoClinicoController {

    private final ProcedimentoClinicoService service;

    ProcedimentoClinicoController(ProcedimentoClinicoService service) {
        this.service = service;
    }

    @GetMapping("/api/procedimentos")
    List<ProcedimentoDoCatalogo> catalogo() {
        return service.catalogo();
    }

    @GetMapping("/api/pacientes/{pacienteId}/procedimentos")
    List<ProcedimentoClinicoResponse> listar(@PathVariable UUID pacienteId,
            @RequestParam(required = false) Set<StatusProcedimento> status) {
        return service.listar(pacienteId, status);
    }

    @PostMapping("/api/pacientes/{pacienteId}/procedimentos")
    ResponseEntity<ProcedimentoClinicoResponse> planejar(@PathVariable UUID pacienteId,
            @Valid @RequestBody DadosDoProcedimento dados) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.planejar(pacienteId, dados));
    }

    @PostMapping("/api/pacientes/{pacienteId}/procedimentos/{id}/cancelar")
    ProcedimentoClinicoResponse cancelar(@PathVariable UUID pacienteId, @PathVariable UUID id,
            @Valid @RequestBody Justificativa justificativa) {
        return service.cancelar(pacienteId, id, justificativa);
    }

    @PostMapping("/api/pacientes/{pacienteId}/procedimentos/{id}/anular")
    ProcedimentoClinicoResponse anular(@PathVariable UUID pacienteId, @PathVariable UUID id,
            @Valid @RequestBody Justificativa justificativa) {
        return service.anular(pacienteId, id, justificativa);
    }
}
