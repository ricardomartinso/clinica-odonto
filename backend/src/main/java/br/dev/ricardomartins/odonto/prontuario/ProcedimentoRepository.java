package br.dev.ricardomartins.odonto.prontuario;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface ProcedimentoRepository extends JpaRepository<Procedimento, UUID> {

    List<Procedimento> findByAtivoTrueOrderByNome();
}
