package br.dev.ricardomartins.odonto.acesso;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;

import br.dev.ricardomartins.odonto.shared.UuidV7;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

/** Cria usuários reais no banco e autentica requisições do MockMvc com o mesmo principal da aplicação. */
public final class UsuariosDeTeste {

    public static final String SENHA = "senha-de-teste";

    private static final PasswordEncoder ENCODER = PasswordEncoderFactories.createDelegatingPasswordEncoder();

    private final JdbcTemplate jdbc;

    public UsuariosDeTeste(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public UsuarioAutenticado dentista() {
        return criar("Dra. Teste", "dentista@teste.local", Papel.DENTISTA, true);
    }

    public UsuarioAutenticado recepcao() {
        return criar("Recepção Teste", "recepcao@teste.local", Papel.RECEPCAO, true);
    }

    public UsuarioAutenticado criar(String nome, String email, Papel papel, boolean ativo) {
        UUID id = UuidV7.gerar();
        String senhaHash = ENCODER.encode(SENHA);
        boolean dentista = papel == Papel.DENTISTA;
        jdbc.update("""
                insert into usuario (id, nome, email, senha_hash, papel, cro_numero, cro_uf, ativo, versao,
                                     criado_em, atualizado_em)
                values (?, ?, ?, ?, ?, ?, ?, ?, 0, now(), now())
                """, id, nome, email, senhaHash, papel.name(), dentista ? "12345" : null, dentista ? "SP" : null,
                ativo);
        return new UsuarioAutenticado(id, nome, email, papel, ativo, null);
    }

    public static RequestPostProcessor como(UsuarioAutenticado usuario) {
        return authentication(UsernamePasswordAuthenticationToken.authenticated(usuario, null,
                usuario.getAuthorities()));
    }
}
