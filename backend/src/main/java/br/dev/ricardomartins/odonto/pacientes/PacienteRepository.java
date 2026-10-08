package br.dev.ricardomartins.odonto.pacientes;

import br.dev.ricardomartins.odonto.shared.Cpf;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

interface PacienteRepository extends JpaRepository<Paciente, UUID> {

    boolean existsByCpf(Cpf cpf);

    boolean existsByCpfAndIdNot(Cpf cpf, UUID id);

    /**
     * Filtros opcionais: {@code null} desliga o filtro. {@code padraoNome} já vem normalizado (minúsculo,
     * sem acento) e com os curingas do usuário escapados.
     */
    @Query("""
            select p from Paciente p
            where (:incluirInativos = true or p.ativo = true)
              and (:cpf is null or p.cpf = :cpf)
              and (:padraoNome is null or p.nomeBusca like :padraoNome escape '\\')
            """)
    Page<Paciente> pesquisar(String padraoNome, Cpf cpf, boolean incluirInativos, Pageable pageable);
}
