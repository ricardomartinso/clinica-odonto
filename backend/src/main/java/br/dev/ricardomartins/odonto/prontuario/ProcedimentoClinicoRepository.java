package br.dev.ricardomartins.odonto.prontuario;

import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

interface ProcedimentoClinicoRepository extends JpaRepository<ProcedimentoClinico, UUID> {

    @Query("""
            select p from ProcedimentoClinico p join fetch p.procedimento
            where p.pacienteId = :pacienteId and p.status in :status
            order by p.criadoEm
            """)
    List<ProcedimentoClinico> listar(UUID pacienteId, Collection<StatusProcedimento> status);

    @Query("""
            select p from ProcedimentoClinico p join fetch p.procedimento
            where p.evolucaoId in :evolucoes
            order by p.criadoEm
            """)
    List<ProcedimentoClinico> realizadosNas(Collection<UUID> evolucoes);
}
