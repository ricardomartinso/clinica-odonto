package br.dev.ricardomartins.odonto.prontuario;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

interface EvolucaoClinicaRepository extends JpaRepository<EvolucaoClinica, UUID> {

    Page<EvolucaoClinica> findByPacienteIdOrderByDataAtendimentoDescCriadoEmDesc(UUID pacienteId, Pageable pageable);
}
