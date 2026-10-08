package br.dev.ricardomartins.odonto;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.dev.ricardomartins.odonto.shared.Cpf;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.ActiveProfiles;

/**
 * Garante que o seed do perfil dev continua compatível com o schema e suas constraints.
 * Perfil diferente = contexto (e container) próprio, isolado dos demais testes.
 */
@ActiveProfiles("dev")
class SeedDevTest extends TesteDeIntegracao {

    @Test
    void seedRespeitaAsRegrasDoDominio() {
        assertThat(jdbc.queryForObject("select count(*) from paciente", Integer.class)).isEqualTo(30);
        assertThat(jdbc.queryForObject("select count(*) from anamnese", Integer.class)).isEqualTo(13);

        List<String> cpfs = jdbc.queryForList("""
                select cpf from paciente where cpf is not null
                union all
                select responsavel_cpf from paciente where responsavel_cpf is not null
                """, String.class);
        assertThat(cpfs).isNotEmpty().allMatch(Cpf::valido);

        Integer menoresSemResponsavel = jdbc.queryForObject("""
                select count(*) from paciente
                where age(current_date, data_nascimento) < interval '18 years' and responsavel_nome is null
                """, Integer.class);
        assertThat(menoresSemResponsavel).isZero();
    }

    @Test
    void usuarioDoSeedConsegueEntrarEPesquisar() throws Exception {
        MockHttpSession sessao = (MockHttpSession) mvc.perform(post("/api/auth/login").with(Csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email": "recepcao@clinica.test", "senha": "clinica123"}
                                """))
                .andExpect(status().isOk())
                .andReturn().getRequest().getSession(false);

        mvc.perform(get("/api/pacientes?busca=conceicao").session(sessao))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isNotEmpty());
    }
}
