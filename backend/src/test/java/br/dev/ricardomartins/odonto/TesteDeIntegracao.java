package br.dev.ricardomartins.odonto;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Base dos testes de integração: contexto completo, MockMvc e Postgres via Testcontainers.
 * Sem {@code @Transactional} nos testes: as transações fazem commit de verdade, como em produção
 * (necessário, por exemplo, para o Envers gravar revisões). Cada teste limpa o que criou.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
public abstract class TesteDeIntegracao {

    @Autowired
    protected MockMvc mvc;

    @Autowired
    protected JdbcTemplate jdbc;

    /** TRUNCATE ... CASCADE em usuario alcança todas as tabelas que referenciam usuários. */
    protected void limparBanco() {
        jdbc.execute("truncate table usuario, revisao restart identity cascade");
    }
}
