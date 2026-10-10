package br.dev.ricardomartins.odonto.prontuario;

import static br.dev.ricardomartins.odonto.acesso.UsuariosDeTeste.como;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.dev.ricardomartins.odonto.Csrf;
import br.dev.ricardomartins.odonto.TesteDeIntegracao;
import br.dev.ricardomartins.odonto.acesso.Papel;
import br.dev.ricardomartins.odonto.acesso.UsuarioAutenticado;
import br.dev.ricardomartins.odonto.acesso.UsuariosDeTeste;
import com.jayway.jsonpath.JsonPath;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

class ProntuarioIntegracaoTest extends TesteDeIntegracao {

    // IDs fixos do catálogo (migration V3)
    private static final String PROFILAXIA = "01920000-0000-7000-8000-000000000002"; // BOCA
    private static final String RASPAGEM = "01920000-0000-7000-8000-000000000006"; // ARCADA
    private static final String EXODONTIA = "01920000-0000-7000-8000-000000000013"; // DENTE
    private static final String RESTAURACAO = "01920000-0000-7000-8000-000000000019"; // FACE

    /** "Hoje" no fuso da clínica, como na regra de negócio (o runner do CI roda em UTC). */
    private static final LocalDate HOJE_NA_CLINICA = LocalDate.now(ZoneId.of("America/Sao_Paulo"));
    private static final String HOJE = HOJE_NA_CLINICA.toString();

    private UsuarioAutenticado dentista;
    private UsuarioAutenticado outraDentista;
    private UsuarioAutenticado recepcao;
    private String pacienteId;

    @BeforeEach
    void setUp() throws Exception {
        UsuariosDeTeste usuarios = new UsuariosDeTeste(jdbc);
        dentista = usuarios.dentista();
        outraDentista = usuarios.criar("Dr. Outro", "outro@teste.local", Papel.DENTISTA, true);
        recepcao = usuarios.recepcao();
        pacienteId = idDe(mvc.perform(post("/api/pacientes").with(como(recepcao)).with(Csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome": "Paciente Prontuário", "dataNascimento": "1980-01-01", "celular": "11999990000"}
                                """))
                .andExpect(status().isCreated()));
    }

    @AfterEach
    void tearDown() {
        limparBanco();
    }

    @Nested
    class Catalogo {

        @Test
        void listaProcedimentosAtivosComAbrangencia() throws Exception {
            mvc.perform(get("/api/procedimentos").with(como(dentista)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(21))
                    .andExpect(jsonPath("$[?(@.nome == 'Restauração em resina composta')].abrangencia")
                            .value(hasItem("FACE")));
        }

        @Test
        void recepcaoNaoAcessaOProntuario() throws Exception {
            mvc.perform(get("/api/procedimentos").with(como(recepcao))).andExpect(status().isForbidden());
            mvc.perform(get("/api/pacientes/{id}/procedimentos", pacienteId).with(como(recepcao)))
                    .andExpect(status().isForbidden());
            mvc.perform(get("/api/pacientes/{id}/evolucoes", pacienteId).with(como(recepcao)))
                    .andExpect(status().isForbidden());
            enviar(post("/api/pacientes/{id}/evolucoes", pacienteId), recepcao, atendimento("Texto", "[]", "[]"))
                    .andExpect(status().isForbidden());
        }
    }

    @Nested
    class PlanoDeTratamento {

        @Test
        void planejaRestauracaoComFacesNomeadasConformeODente() throws Exception {
            planejar(procedimento(RESTAURACAO, "16", "[\"O_I\", \"M\"]", null))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.status").value("PLANEJADO"))
                    .andExpect(jsonPath("$.faces", contains("M", "O_I")))
                    .andExpect(jsonPath("$.local").value("16 · Mesial, Oclusal"))
                    .andExpect(jsonPath("$.procedimento.abrangencia").value("FACE"));

            planejar(procedimento(RESTAURACAO, "21", "[\"O_I\", \"L_P\"]", null))
                    .andExpect(jsonPath("$.local").value("21 · Incisal, Palatina"));
        }

        @Test
        void exigeLocalizacaoCompativelComAAbrangencia() throws Exception {
            planejar(procedimento(RESTAURACAO, "16", null, null))
                    .andExpect(status().isUnprocessableEntity())
                    .andExpect(jsonPath("$.detail").value("Este procedimento exige o dente e ao menos uma face."));
            planejar(procedimento(EXODONTIA, "38", "[\"M\"]", null)).andExpect(status().isUnprocessableEntity());
            planejar(procedimento(RASPAGEM, null, null, null)).andExpect(status().isUnprocessableEntity());
            planejar(procedimento(PROFILAXIA, "11", null, null)).andExpect(status().isUnprocessableEntity());

            planejar(procedimento(EXODONTIA, "38", null, null)).andExpect(jsonPath("$.local").value("Dente 38"));
            planejar(procedimento(RASPAGEM, null, null, "INFERIOR"))
                    .andExpect(jsonPath("$.local").value("Arcada inferior"));
            planejar(procedimento(PROFILAXIA, null, null, null)).andExpect(jsonPath("$.local").value("Boca toda"));
        }

        @Test
        void aceitaDentesDeciduosERecusaCodigoForaDaNotacaoFdi() throws Exception {
            planejar(procedimento(EXODONTIA, "55", null, null)).andExpect(status().isCreated());

            planejar(procedimento(EXODONTIA, "19", null, null))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.erros[0].campo").value("dente"));
        }

        @Test
        void cancelarExigeMotivoESoValeParaPlanejados() throws Exception {
            String id = idDe(planejar(procedimento(EXODONTIA, "38", null, null)));

            enviar(post("/api/pacientes/{p}/procedimentos/{id}/cancelar", pacienteId, id), dentista, "{\"motivo\": \"\"}")
                    .andExpect(status().isBadRequest());
            enviar(post("/api/pacientes/{p}/procedimentos/{id}/cancelar", pacienteId, id), dentista,
                    "{\"motivo\": \"Paciente optou por não extrair\"}")
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("CANCELADO"))
                    .andExpect(jsonPath("$.motivo").value("Paciente optou por não extrair"));
            enviar(post("/api/pacientes/{p}/procedimentos/{id}/anular", pacienteId, id), dentista,
                    "{\"motivo\": \"x\"}")
                    .andExpect(status().isUnprocessableEntity());
        }

        @Test
        void pacienteInativoNaoRecebeNovosRegistros() throws Exception {
            mvc.perform(post("/api/pacientes/{id}/inativar", pacienteId).with(como(recepcao)).with(Csrf.token()));

            planejar(procedimento(EXODONTIA, "38", null, null)).andExpect(status().isUnprocessableEntity());
            registrar(atendimento("Texto", "[]", "[]")).andExpect(status().isUnprocessableEntity());
        }
    }

    @Nested
    class RegistroDeAtendimento {

        @Test
        void realizaPlanejadosEIncluiNaoPlanejadosNaMesmaEvolucao() throws Exception {
            String planejado = idDe(planejar(procedimento(RESTAURACAO, "16", "[\"M\", \"O_I\"]", null)));

            registrar(atendimento("Restauração MO no 16 com resina A2. Profilaxia.",
                    "[\"" + planejado + "\"]", "[" + procedimento(PROFILAXIA, null, null, null) + "]"))
                    .andExpect(status().isCreated())
                    .andExpect(header().string(HttpHeaders.ETAG, "\"0\""))
                    .andExpect(jsonPath("$.autor.nome").value("Dra. Teste"))
                    .andExpect(jsonPath("$.procedimentosRealizados.length()").value(2))
                    .andExpect(jsonPath("$.procedimentosRealizados[*].status", everyItem(
                            is("REALIZADO"))))
                    .andExpect(jsonPath("$.procedimentosRealizados[*].realizadoEm", everyItem(
                            is(HOJE))));

            mvc.perform(get("/api/pacientes/{id}/procedimentos?status=PLANEJADO", pacienteId).with(como(dentista)))
                    .andExpect(jsonPath("$.length()").value(0));
        }

        @Test
        void eAtomicoQualquerErroDesfazTudo() throws Exception {
            String planejado = idDe(planejar(procedimento(EXODONTIA, "38", null, null)));

            // um ID inexistente entre os planejados
            registrar(atendimento("Texto", "[\"" + planejado + "\", \"" + UUID.randomUUID() + "\"]", "[]"))
                    .andExpect(status().isUnprocessableEntity());
            // um procedimento novo inválido
            registrar(atendimento("Texto", "[\"" + planejado + "\"]",
                    "[" + procedimento(RESTAURACAO, "16", null, null) + "]"))
                    .andExpect(status().isUnprocessableEntity());

            assertThat(jdbc.queryForObject("select count(*) from evolucao_clinica", Integer.class)).isZero();
            assertThat(jdbc.queryForObject("select status from procedimento_clinico where id = ?::uuid",
                    String.class, planejado)).isEqualTo("PLANEJADO");
        }

        @Test
        void naoRealizaDuasVezesOMesmoProcedimento() throws Exception {
            String planejado = idDe(planejar(procedimento(EXODONTIA, "38", null, null)));
            registrar(atendimento("Primeiro", "[\"" + planejado + "\"]", "[]")).andExpect(status().isCreated());

            registrar(atendimento("Segundo", "[\"" + planejado + "\"]", "[]"))
                    .andExpect(status().isUnprocessableEntity())
                    .andExpect(jsonPath("$.detail").value("Somente procedimentos planejados podem ser realizados."));
        }

        @Test
        void validaDataETexto() throws Exception {
            registrar("""
                    {"dataAtendimento": "%s", "texto": "Atendimento"}
                    """.formatted(HOJE_NA_CLINICA.plusDays(1)))
                    .andExpect(status().isUnprocessableEntity());
            registrar("""
                    {"dataAtendimento": "%s", "texto": " "}
                    """.formatted(HOJE))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.erros[0].campo").value("texto"));
        }

        @Test
        void linhaDoTempoVemDaMaisRecenteParaAMaisAntiga() throws Exception {
            registrar("""
                    {"dataAtendimento": "2026-01-10", "texto": "Antiga"}
                    """);
            registrar("""
                    {"dataAtendimento": "2026-03-05", "texto": "Recente"}
                    """);

            mvc.perform(get("/api/pacientes/{id}/evolucoes", pacienteId).with(como(dentista)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content[*].texto", contains("Recente", "Antiga")))
                    .andExpect(jsonPath("$.page.totalElements").value(2));
        }
    }

    @Nested
    class EdicaoEAnulacao {

        private String evolucaoId;
        private String procedimentoId;

        @BeforeEach
        void registrarAtendimento() throws Exception {
            procedimentoId = idDe(planejar(procedimento(EXODONTIA, "48", null, null)));
            evolucaoId = idDe(registrar(atendimento("Exodontia do 48.", "[\"" + procedimentoId + "\"]", "[]")));
        }

        @Test
        void autorEditaComIfMatchEAAlteracaoFicaNoHistorico() throws Exception {
            editar(dentista, null, "Sem If-Match").andExpect(status().isPreconditionRequired());
            editar(dentista, "\"0\"", "Exodontia do 48, sem intercorrências.")
                    .andExpect(status().isOk())
                    .andExpect(header().string(HttpHeaders.ETAG, "\"1\""))
                    .andExpect(jsonPath("$.editadaEm").value(notNullValue()));
            editar(dentista, "\"0\"", "Versão antiga").andExpect(status().isPreconditionFailed());

            mvc.perform(get("/api/pacientes/{p}/evolucoes/{id}/historico", pacienteId, evolucaoId).with(como(dentista)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[*].tipo", contains("CRIACAO", "EDICAO")))
                    .andExpect(jsonPath("$[*].texto", contains("Exodontia do 48.", "Exodontia do 48, sem intercorrências.")))
                    .andExpect(jsonPath("$[*].alteradaPor.nome", everyItem(is("Dra. Teste"))));
        }

        @Test
        void outroDentistaNaoEditaNemAnula() throws Exception {
            editar(outraDentista, "\"0\"", "Tentativa")
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.detail").value("Somente o autor pode editar esta evolução."));
            anular(outraDentista, "Tentativa").andExpect(status().isForbidden());
        }

        @Test
        void anularEvolucaoAnulaEmCascataOsProcedimentosRealizados() throws Exception {
            anular(dentista, "Registrado no paciente errado")
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.anulacao.motivo").value("Registrado no paciente errado"))
                    .andExpect(jsonPath("$.anulacao.por.nome").value("Dra. Teste"))
                    .andExpect(jsonPath("$.procedimentosRealizados[0].status").value("ANULADO"))
                    .andExpect(jsonPath("$.procedimentosRealizados[0].motivo").value("Registrado no paciente errado"));

            editar(dentista, "\"1\"", "Depois de anulada").andExpect(status().isUnprocessableEntity());
            mvc.perform(get("/api/pacientes/{p}/evolucoes/{id}/historico", pacienteId, evolucaoId).with(como(dentista)))
                    .andExpect(jsonPath("$[*].tipo", contains("CRIACAO", "ANULACAO")));
        }

        @Test
        void procedimentoRealizadoSoPodeSerAnuladoPorQuemORealizou() throws Exception {
            enviar(post("/api/pacientes/{p}/procedimentos/{id}/anular", pacienteId, procedimentoId), outraDentista,
                    "{\"motivo\": \"x\"}")
                    .andExpect(status().isForbidden());
            enviar(post("/api/pacientes/{p}/procedimentos/{id}/anular", pacienteId, procedimentoId), dentista,
                    "{\"motivo\": \"Dente errado\"}")
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("ANULADO"));
        }

        @Test
        void evolucaoDeOutroPacienteNaoEhEncontrada() throws Exception {
            mvc.perform(get("/api/pacientes/{p}/evolucoes/{id}", UUID.randomUUID(), evolucaoId).with(como(dentista)))
                    .andExpect(status().isNotFound());
        }

        private ResultActions editar(UsuarioAutenticado usuario, String ifMatch, String texto) throws Exception {
            MockHttpServletRequestBuilder requisicao = put("/api/pacientes/{p}/evolucoes/{id}", pacienteId, evolucaoId);
            if (ifMatch != null) {
                requisicao.header(HttpHeaders.IF_MATCH, ifMatch);
            }
            return enviar(requisicao, usuario, """
                    {"dataAtendimento": "%s", "texto": "%s"}
                    """.formatted(HOJE, texto));
        }

        private ResultActions anular(UsuarioAutenticado usuario, String motivo) throws Exception {
            return enviar(post("/api/pacientes/{p}/evolucoes/{id}/anular", pacienteId, evolucaoId), usuario,
                    "{\"motivo\": \"%s\"}".formatted(motivo));
        }
    }

    @Test
    void alteracoesDosProcedimentosFicamAuditadasComOAutor() throws Exception {
        String id = idDe(planejar(procedimento(EXODONTIA, "38", null, null)));
        registrar(atendimento("Exodontia", "[\"" + id + "\"]", "[]"));

        var historico = jdbc.queryForList("""
                select a.status, r.usuario_id from procedimento_clinico_aud a join revisao r on r.id = a.rev
                where a.id = ?::uuid order by a.rev
                """, id);
        assertThat(historico).extracting(linha -> linha.get("status")).containsExactly("PLANEJADO", "REALIZADO");
        assertThat(historico).extracting(linha -> linha.get("usuario_id")).containsOnly(dentista.usuarioId());
    }

    private ResultActions planejar(String corpo) throws Exception {
        return enviar(post("/api/pacientes/{id}/procedimentos", pacienteId), dentista, corpo);
    }

    private ResultActions registrar(String corpo) throws Exception {
        return enviar(post("/api/pacientes/{id}/evolucoes", pacienteId), dentista, corpo);
    }

    private ResultActions enviar(MockHttpServletRequestBuilder requisicao, UsuarioAutenticado usuario, String corpo)
            throws Exception {
        return mvc.perform(requisicao.with(como(usuario)).with(Csrf.token())
                .contentType(MediaType.APPLICATION_JSON)
                .content(corpo));
    }

    private static String procedimento(String procedimentoId, String dente, String faces, String arcada) {
        return """
                {"procedimentoId": "%s", "dente": %s, "faces": %s, "arcada": %s}
                """.formatted(procedimentoId, dente, faces, arcada == null ? null : "\"" + arcada + "\"");
    }

    private static String atendimento(String texto, String planejados, String novos) {
        return """
                {"dataAtendimento": "%s", "texto": "%s", "procedimentosRealizados": %s, "novosProcedimentos": %s}
                """.formatted(HOJE, texto, planejados, novos);
    }

    private static String idDe(ResultActions resultado) throws Exception {
        return JsonPath.read(resultado.andReturn().getResponse().getContentAsString(), "$.id");
    }
}
