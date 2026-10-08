package br.dev.ricardomartins.odonto.pacientes;

import static br.dev.ricardomartins.odonto.acesso.UsuariosDeTeste.como;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.endsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.dev.ricardomartins.odonto.Csrf;
import br.dev.ricardomartins.odonto.TesteDeIntegracao;
import br.dev.ricardomartins.odonto.acesso.UsuarioAutenticado;
import br.dev.ricardomartins.odonto.acesso.UsuariosDeTeste;
import com.jayway.jsonpath.JsonPath;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

class AnamneseIntegracaoTest extends TesteDeIntegracao {

    private static final String RESPOSTAS = """
            {
              "alergico": true,
              "alergiasDescricao": "Penicilina",
              "usaAnticoagulante": false,
              "diabetes": true,
              "hipertensao": null,
              "gestante": false,
              "medicamentosEmUso": "Metformina 850 mg"
            }
            """;

    private UsuarioAutenticado dentista;
    private UsuarioAutenticado recepcao;
    private UUID pacienteId;

    @BeforeEach
    void setUp() throws Exception {
        UsuariosDeTeste usuarios = new UsuariosDeTeste(jdbc);
        dentista = usuarios.dentista();
        recepcao = usuarios.recepcao();
        String resposta = mvc.perform(post("/api/pacientes").with(como(recepcao)).with(Csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome": "Paciente Anamnese", "dataNascimento": "1970-08-15", "celular": "21998765432"}
                                """))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        pacienteId = UUID.fromString(JsonPath.read(resposta, "$.id"));
    }

    @AfterEach
    void tearDown() {
        limparBanco();
    }

    @Test
    void primeiraGravacaoCriaEDerivaAlertas() throws Exception {
        gravar(dentista, null, RESPOSTAS)
                .andExpect(status().isCreated())
                .andExpect(header().string(HttpHeaders.LOCATION, endsWith("/api/pacientes/" + pacienteId + "/anamnese")))
                .andExpect(header().string(HttpHeaders.ETAG, "\"0\""))
                .andExpect(jsonPath("$.alertas", contains("ALERGIA", "DIABETES")))
                .andExpect(jsonPath("$.respostas.alergiasDescricao").value("Penicilina"));
    }

    @Test
    void distingueNaoInformadoDeNao() throws Exception {
        gravar(dentista, null, RESPOSTAS).andExpect(status().isCreated());

        mvc.perform(get("/api/pacientes/{id}/anamnese", pacienteId).with(como(dentista)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.respostas.usaAnticoagulante").value(false))
                .andExpect(jsonPath("$.respostas.hipertensao").isEmpty())
                .andExpect(jsonPath("$.respostas.cardiopatia").isEmpty());
    }

    @Test
    void alteracaoExigeIfMatchComAVersaoAtual() throws Exception {
        gravar(dentista, null, RESPOSTAS).andExpect(status().isCreated());

        gravar(dentista, null, RESPOSTAS).andExpect(status().isPreconditionRequired());
        gravar(dentista, "\"7\"", RESPOSTAS).andExpect(status().isPreconditionFailed());
        gravar(dentista, "\"0\"", """
                {"alergico": false, "gestante": true, "semanasGestacao": 20}
                """)
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ETAG, "\"1\""))
                .andExpect(jsonPath("$.alertas", contains("GESTANTE")));
    }

    @Test
    void ifMatchNaCriacaoEhRecusado() throws Exception {
        gravar(dentista, "\"0\"", RESPOSTAS).andExpect(status().isPreconditionFailed());
    }

    @Test
    void historicoDeAlteracoesFicaAuditadoComOAutor() throws Exception {
        gravar(dentista, null, RESPOSTAS).andExpect(status().isCreated());
        gravar(dentista, "\"0\"", """
                {"alergico": false}
                """).andExpect(status().isOk());

        List<Map<String, Object>> historico = jdbc.queryForList("""
                select a.revtype, a.alergico, a.alergias_descricao, r.usuario_id, r.momento
                from anamnese_aud a join revisao r on r.id = a.rev
                where a.paciente_id = ?
                order by a.rev
                """, pacienteId);

        assertThat(historico).hasSize(2);
        assertThat(historico.get(0))
                .containsEntry("revtype", 0)
                .containsEntry("alergico", true)
                .containsEntry("alergias_descricao", "Penicilina")
                .containsEntry("usuario_id", dentista.usuarioId());
        assertThat(historico.get(1))
                .containsEntry("revtype", 1)
                .containsEntry("alergico", false)
                .containsEntry("usuario_id", dentista.usuarioId());
        assertThat(historico.get(1).get("momento")).isNotNull();
    }

    @Test
    void regrasDeConsistenciaDasRespostas() throws Exception {
        gravar(dentista, null, """
                {"alergico": true}
                """)
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.detail").value("Informe a quais substâncias o paciente é alérgico."));

        gravar(dentista, null, """
                {"gestante": true}
                """).andExpect(status().isUnprocessableEntity());

        gravar(dentista, null, """
                {"gestante": false, "semanasGestacao": 12}
                """).andExpect(status().isUnprocessableEntity());

        gravar(dentista, null, """
                {"gestante": true, "semanasGestacao": 50}
                """)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[0].campo").value("semanasGestacao"));
    }

    @Test
    void recepcaoNaoAcessaAnamnese() throws Exception {
        gravar(recepcao, null, RESPOSTAS)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.title").value("Acesso negado"));

        mvc.perform(get("/api/pacientes/{id}/anamnese", pacienteId).with(como(recepcao)))
                .andExpect(status().isForbidden());
    }

    @Test
    void anamneseNaoRegistradaRetorna404() throws Exception {
        mvc.perform(get("/api/pacientes/{id}/anamnese", pacienteId).with(como(dentista)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Anamnese ainda não registrada para este paciente."));
    }

    @Test
    void pacienteInexistenteRetorna404() throws Exception {
        mvc.perform(get("/api/pacientes/{id}/anamnese", UUID.randomUUID()).with(como(dentista)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Paciente não encontrado."));
    }

    @Test
    void pacienteInativoNaoRecebeAnamnese() throws Exception {
        mvc.perform(post("/api/pacientes/{id}/inativar", pacienteId).with(como(recepcao)).with(Csrf.token()))
                .andExpect(status().isNoContent());

        gravar(dentista, null, RESPOSTAS).andExpect(status().isUnprocessableEntity());
    }

    private ResultActions gravar(UsuarioAutenticado usuario, String ifMatch, String corpo) throws Exception {
        var requisicao = put("/api/pacientes/{id}/anamnese", pacienteId).with(como(usuario)).with(Csrf.token())
                .contentType(MediaType.APPLICATION_JSON)
                .content(corpo);
        if (ifMatch != null) {
            requisicao.header(HttpHeaders.IF_MATCH, ifMatch);
        }
        return mvc.perform(requisicao);
    }
}
