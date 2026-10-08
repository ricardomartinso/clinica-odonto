package br.dev.ricardomartins.odonto.acesso;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.blankOrNullString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.dev.ricardomartins.odonto.Csrf;
import br.dev.ricardomartins.odonto.TesteDeIntegracao;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MvcResult;

class AutenticacaoTest extends TesteDeIntegracao {

    private UsuariosDeTeste usuarios;

    @BeforeEach
    void setUp() {
        usuarios = new UsuariosDeTeste(jdbc);
    }

    @AfterEach
    void tearDown() {
        limparBanco();
    }

    @Test
    void fluxoCompletoDoSpaComCookieCsrfSessaoELogout() throws Exception {
        usuarios.dentista();

        // 1. Primeira chamada sem sessão: 401, mas já recebe o cookie CSRF.
        MvcResult anonimo = mvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(cookie().value("XSRF-TOKEN", not(blankOrNullString())))
                .andReturn();
        Cookie xsrf = anonimo.getResponse().getCookie("XSRF-TOKEN");

        // 2. Login devolvendo o token no header, como o SPA fará.
        MvcResult login = mvc.perform(post("/api/auth/login")
                        .cookie(xsrf)
                        .header("X-XSRF-TOKEN", xsrf.getValue())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email": "DENTISTA@teste.local", "senha": "%s"}
                                """.formatted(UsuariosDeTeste.SENHA)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.papel").value("DENTISTA"))
                .andExpect(jsonPath("$.senha").doesNotExist())
                .andReturn();
        MockHttpSession sessao = (MockHttpSession) login.getRequest().getSession(false);

        // 3. Sessão autenticada.
        mvc.perform(get("/api/auth/me").session(sessao))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("dentista@teste.local"));

        // 4. Logout invalida a sessão.
        mvc.perform(post("/api/auth/logout").session(sessao).with(Csrf.token()))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/auth/me").session(sessao))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void loginSemTokenCsrfEhRecusado() throws Exception {
        usuarios.dentista();

        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email": "dentista@teste.local", "senha": "%s"}
                                """.formatted(UsuariosDeTeste.SENHA)))
                .andExpect(status().isForbidden())
                .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON));
    }

    @Test
    void senhaErradaEmailInexistenteEUsuarioInativoTemAMesmaResposta() throws Exception {
        usuarios.dentista();
        usuarios.criar("Inativa", "inativa@teste.local", Papel.RECEPCAO, false);

        String[][] tentativas = {
                {"dentista@teste.local", "senha-errada"},
                {"ninguem@teste.local", UsuariosDeTeste.SENHA},
                {"inativa@teste.local", UsuariosDeTeste.SENHA},
        };
        for (String[] tentativa : tentativas) {
            mvc.perform(post("/api/auth/login").with(Csrf.token())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"email": "%s", "senha": "%s"}
                                    """.formatted(tentativa[0], tentativa[1])))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.title").value("Credenciais inválidas"))
                    .andExpect(jsonPath("$.detail").value("E-mail ou senha inválidos."));
        }
    }

    @Test
    void loginComCamposVaziosRetornaErrosDeValidacao() throws Exception {
        mvc.perform(post("/api/auth/login").with(Csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\": \"\", \"senha\": \"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[0].campo").value("email"))
                .andExpect(jsonPath("$.erros[1].campo").value("senha"));
    }

    @Test
    void loginTrocaOIdDaSessao() throws Exception {
        usuarios.dentista();
        MockHttpSession sessaoAnterior = new MockHttpSession();
        String idAnterior = sessaoAnterior.getId();

        MvcResult login = mvc.perform(post("/api/auth/login").session(sessaoAnterior).with(Csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email": "dentista@teste.local", "senha": "%s"}
                                """.formatted(UsuariosDeTeste.SENHA)))
                .andExpect(status().isOk())
                .andReturn();

        assertThat(login.getRequest().getSession(false).getId())
                .isNotEqualTo(idAnterior);
    }

    @Test
    void healthCheckEhPublico() throws Exception {
        mvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }
}
