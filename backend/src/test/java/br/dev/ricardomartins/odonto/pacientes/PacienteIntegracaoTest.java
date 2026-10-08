package br.dev.ricardomartins.odonto.pacientes;

import static br.dev.ricardomartins.odonto.acesso.UsuariosDeTeste.como;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.dev.ricardomartins.odonto.Csrf;
import br.dev.ricardomartins.odonto.TesteDeIntegracao;
import br.dev.ricardomartins.odonto.acesso.UsuarioAutenticado;
import br.dev.ricardomartins.odonto.acesso.UsuariosDeTeste;
import com.jayway.jsonpath.JsonPath;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

class PacienteIntegracaoTest extends TesteDeIntegracao {

    private static final String CPF = "10433218100";
    private static final String OUTRO_CPF = "96001338914";
    private static final String CELULAR = "11987654321";

    private UsuarioAutenticado recepcao;

    @BeforeEach
    void setUp() {
        recepcao = new UsuariosDeTeste(jdbc).recepcao();
    }

    @AfterEach
    void tearDown() {
        limparBanco();
    }

    @Nested
    class Cadastro {

        @Test
        void cadastraERetornaLocationEtagEDetalhe() throws Exception {
            MvcResult resultado = cadastrar(pacienteAdulto("Maria José da Silva", CPF))
                    .andExpect(status().isCreated())
                    .andExpect(header().string(HttpHeaders.LOCATION, containsString("/api/pacientes/")))
                    .andExpect(header().string(HttpHeaders.ETAG, "\"0\""))
                    .andExpect(jsonPath("$.nome").value("Maria José da Silva"))
                    .andExpect(jsonPath("$.cpf").value(CPF))
                    .andExpect(jsonPath("$.ativo").value(true))
                    .andExpect(jsonPath("$.versao").doesNotExist())
                    .andExpect(jsonPath("$.anamnese").doesNotExist())
                    .andReturn();

            UUID id = idDe(resultado);
            UUID criadoPor = jdbc.queryForObject("select criado_por from paciente where id = ?", UUID.class, id);
            assertThat(criadoPor).isEqualTo(recepcao.usuarioId());
        }

        @Test
        void validaCamposSemDevolverOsValoresRejeitados() throws Exception {
            String invalido = """
                    {"nome": " ", "dataNascimento": "2999-01-01", "cpf": "12345678900", "celular": "(11) 9999-0000",
                     "email": "nao-eh-email"}
                    """;

            cadastrar(invalido)
                    .andExpect(status().isBadRequest())
                    .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
                    .andExpect(jsonPath("$.title").value("Dados inválidos"))
                    .andExpect(jsonPath("$.erros[*].campo")
                            .value(containsInAnyOrder(
                                    "celular", "cpf", "dataNascimento", "email", "nome")))
                    .andExpect(content().string(not(containsString("12345678900"))))
                    .andExpect(content().string(not(containsString("9999-0000"))));
        }

        @Test
        void recusaCpfJaCadastrado() throws Exception {
            cadastrar(pacienteAdulto("Primeira Pessoa", CPF)).andExpect(status().isCreated());

            cadastrar(pacienteAdulto("Segunda Pessoa", CPF))
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.detail").value("Já existe um paciente cadastrado com este CPF."));
        }

        @Test
        void cpfEhOpcionalEPodeFaltarEmVariosPacientes() throws Exception {
            cadastrar(pacienteAdulto("Sem CPF Um", null)).andExpect(status().isCreated());
            cadastrar(pacienteAdulto("Sem CPF Dois", null)).andExpect(status().isCreated());
        }

        @Test
        void menorDeIdadeExigeResponsavelLegal() throws Exception {
            String nascimento = LocalDate.now().minusYears(10).toString();

            cadastrar(paciente("Criança Sem Responsável", null, nascimento, null))
                    .andExpect(status().isUnprocessableEntity())
                    .andExpect(jsonPath("$.detail").value("Paciente menor de 18 anos exige responsável legal."));

            String responsavel = """
                    {"nome": "Ana Responsável", "cpf": "%s", "telefone": "11912345678", "parentesco": "Mãe"}
                    """.formatted(OUTRO_CPF);
            cadastrar(paciente("Criança Com Responsável", null, nascimento, responsavel))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.responsavel.nome").value("Ana Responsável"))
                    .andExpect(jsonPath("$.responsavel.cpf").value(OUTRO_CPF));
        }

        @Test
        void exigeAutenticacao() throws Exception {
            mvc.perform(post("/api/pacientes").with(Csrf.token())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(pacienteAdulto("Fulano", null)))
                    .andExpect(status().isUnauthorized());
        }
    }

    @Nested
    class Pesquisa {

        @BeforeEach
        void cadastrarPacientes() throws Exception {
            cadastrar(pacienteAdulto("José Antônio Araújo", CPF));
            cadastrar(pacienteAdulto("Joana Prado", OUTRO_CPF));
            cadastrar(paciente("Carlos Eduardo Lima", null, "1980-05-10", null, "Duda"));
            UUID inativo = idDe(cadastrar(pacienteAdulto("José Inativo", null)).andReturn());
            mvc.perform(post("/api/pacientes/{id}/inativar", inativo).with(como(recepcao)).with(Csrf.token()));
        }

        @Test
        void buscaPorNomeIgnorandoAcentosEMaiusculas() throws Exception {
            pesquisar("?busca=JOSE ANTONIO")
                    .andExpect(jsonPath("$.content.length()").value(1))
                    .andExpect(jsonPath("$.content[0].nome").value("José Antônio Araújo"));
        }

        @Test
        void buscaTambemPeloNomeSocial() throws Exception {
            pesquisar("?busca=duda")
                    .andExpect(jsonPath("$.content[0].nome").value("Carlos Eduardo Lima"))
                    .andExpect(jsonPath("$.content[0].nomeSocial").value("Duda"));
        }

        @Test
        void buscaPorCpfExato() throws Exception {
            pesquisar("?busca=" + OUTRO_CPF)
                    .andExpect(jsonPath("$.content.length()").value(1))
                    .andExpect(jsonPath("$.content[0].nome").value("Joana Prado"));
        }

        @Test
        void listagemMascaraOCpfENaoExpoeContatos() throws Exception {
            pesquisar("?busca=araujo")
                    .andExpect(jsonPath("$.content[0].cpfMascarado").value("***.332.181-**"))
                    .andExpect(jsonPath("$.content[0].cpf").doesNotExist())
                    .andExpect(jsonPath("$.content[0].celular").doesNotExist())
                    .andExpect(content().string(not(containsString(CPF))));
        }

        @Test
        void ocultaInativosPorPadrao() throws Exception {
            pesquisar("?busca=jose")
                    .andExpect(jsonPath("$.content.length()").value(1));
            pesquisar("?busca=jose&incluirInativos=true")
                    .andExpect(jsonPath("$.content.length()").value(2));
        }

        @Test
        void ordenaPorNomeEPagina() throws Exception {
            pesquisar("?tamanho=2&pagina=0")
                    .andExpect(jsonPath("$.content[0].nome").value("Carlos Eduardo Lima"))
                    .andExpect(jsonPath("$.content[1].nome").value("Joana Prado"))
                    .andExpect(jsonPath("$.page.totalElements").value(3))
                    .andExpect(jsonPath("$.page.totalPages").value(2));
        }

        @Test
        void curingasDigitadosSaoTratadosComoTexto() throws Exception {
            pesquisar("?busca=%25").andExpect(jsonPath("$.content.length()").value(0));
            pesquisar("?busca=_").andExpect(jsonPath("$.content.length()").value(0));
        }

        @Test
        void validaParametrosDePaginacao() throws Exception {
            mvc.perform(get("/api/pacientes?tamanho=500").with(como(recepcao)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.erros[0].campo").value("tamanho"));
        }

        private ResultActions pesquisar(String query) throws Exception {
            return mvc.perform(get("/api/pacientes" + query).with(como(recepcao)))
                    .andExpect(status().isOk());
        }
    }

    @Nested
    class Detalhe {

        @Test
        void retornaDetalheComEtag() throws Exception {
            UUID id = idDe(cadastrar(pacienteAdulto("Paula Souza", CPF)).andReturn());

            mvc.perform(get("/api/pacientes/{id}", id).with(como(recepcao)))
                    .andExpect(status().isOk())
                    .andExpect(header().string(HttpHeaders.ETAG, "\"0\""))
                    .andExpect(jsonPath("$.celular").value(CELULAR));
        }

        @Test
        void pacienteInexistenteRetorna404() throws Exception {
            mvc.perform(get("/api/pacientes/{id}", UUID.randomUUID()).with(como(recepcao)))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.title").value("Recurso não encontrado"));
        }
    }

    @Nested
    class Alteracao {

        private UUID id;

        @BeforeEach
        void cadastrarPaciente() throws Exception {
            id = idDe(cadastrar(pacienteAdulto("Roberto Dias", CPF)).andReturn());
        }

        @Test
        void alteraComIfMatchCorretoEDevolveNovaVersao() throws Exception {
            atualizar("\"0\"", pacienteAdulto("Roberto Dias Filho", CPF))
                    .andExpect(status().isOk())
                    .andExpect(header().string(HttpHeaders.ETAG, "\"1\""))
                    .andExpect(jsonPath("$.nome").value("Roberto Dias Filho"));

            UUID atualizadoPor = jdbc.queryForObject("select atualizado_por from paciente where id = ?", UUID.class, id);
            assertThat(atualizadoPor).isEqualTo(recepcao.usuarioId());
        }

        @Test
        void semIfMatchRetorna428() throws Exception {
            atualizar(null, pacienteAdulto("Roberto", CPF))
                    .andExpect(status().isPreconditionRequired());
        }

        @Test
        void comVersaoDesatualizadaRetorna412ENaoAltera() throws Exception {
            atualizar("\"0\"", pacienteAdulto("Primeira Edição", CPF)).andExpect(status().isOk());

            atualizar("\"0\"", pacienteAdulto("Edição Concorrente", CPF))
                    .andExpect(status().isPreconditionFailed());

            mvc.perform(get("/api/pacientes/{id}", id).with(como(recepcao)))
                    .andExpect(jsonPath("$.nome").value("Primeira Edição"));
        }

        @Test
        void naoPermiteUsarCpfDeOutroPaciente() throws Exception {
            cadastrar(pacienteAdulto("Outra Pessoa", OUTRO_CPF));

            atualizar("\"0\"", pacienteAdulto("Roberto Dias", OUTRO_CPF))
                    .andExpect(status().isConflict());
        }

        @Test
        void pacienteInativoPrecisaSerReativadoAntesDeAlterar() throws Exception {
            mvc.perform(post("/api/pacientes/{id}/inativar", id).with(como(recepcao)).with(Csrf.token()))
                    .andExpect(status().isNoContent());

            atualizar("\"1\"", pacienteAdulto("Roberto", CPF))
                    .andExpect(status().isUnprocessableEntity());

            mvc.perform(post("/api/pacientes/{id}/reativar", id).with(como(recepcao)).with(Csrf.token()))
                    .andExpect(status().isNoContent());
            atualizar("\"2\"", pacienteAdulto("Roberto", CPF))
                    .andExpect(status().isOk());
        }

        private ResultActions atualizar(String ifMatch, String corpo) throws Exception {
            var requisicao = put("/api/pacientes/{id}", id).with(como(recepcao)).with(Csrf.token())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(corpo);
            if (ifMatch != null) {
                requisicao.header(HttpHeaders.IF_MATCH, ifMatch);
            }
            return mvc.perform(requisicao);
        }
    }

    @Test
    @ExtendWith(OutputCaptureExtension.class)
    void dadosSensiveisNaoAparecemNosLogs(CapturedOutput saida) throws Exception {
        cadastrar(pacienteAdulto("Paciente Do Log", CPF)).andExpect(status().isCreated());
        cadastrar(pacienteAdulto("Duplicado", CPF)).andExpect(status().isConflict());
        cadastrar("""
                {"nome": "X", "dataNascimento": "1990-01-01", "cpf": "%s", "celular": "%s"}
                """.formatted("10433218101", "119876543210"))
                .andExpect(status().isBadRequest());

        assertThat(saida.getAll())
                .doesNotContain(CPF)
                .doesNotContain("10433218101")
                .doesNotContain(CELULAR);
    }

    private ResultActions cadastrar(String corpo) throws Exception {
        return mvc.perform(post("/api/pacientes").with(como(recepcao)).with(Csrf.token())
                .contentType(MediaType.APPLICATION_JSON)
                .content(corpo));
    }

    private static UUID idDe(MvcResult resultado) throws Exception {
        return UUID.fromString(JsonPath.read(resultado.getResponse().getContentAsString(), "$.id"));
    }

    private static String pacienteAdulto(String nome, String cpf) {
        return paciente(nome, cpf, "1985-03-20", null);
    }

    private static String paciente(String nome, String cpf, String dataNascimento, String responsavelJson) {
        return paciente(nome, cpf, dataNascimento, responsavelJson, null);
    }

    private static String paciente(String nome, String cpf, String dataNascimento, String responsavelJson,
            String nomeSocial) {
        return """
                {
                  "nome": "%s",
                  "nomeSocial": %s,
                  "dataNascimento": "%s",
                  "cpf": %s,
                  "celular": "%s",
                  "email": "paciente@exemplo.test",
                  "endereco": {"cep": "01310100", "logradouro": "Avenida Exemplo", "numero": "100",
                               "bairro": "Centro", "cidade": "São Paulo", "uf": "SP"},
                  "responsavel": %s
                }
                """.formatted(nome, jsonOuNull(nomeSocial), dataNascimento, jsonOuNull(cpf), CELULAR,
                responsavelJson == null ? "null" : responsavelJson);
    }

    private static String jsonOuNull(String valor) {
        return valor == null ? "null" : "\"" + valor + "\"";
    }
}
