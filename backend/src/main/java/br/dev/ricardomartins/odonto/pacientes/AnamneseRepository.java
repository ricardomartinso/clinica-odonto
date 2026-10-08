package br.dev.ricardomartins.odonto.pacientes;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface AnamneseRepository extends JpaRepository<Anamnese, UUID> {
}
