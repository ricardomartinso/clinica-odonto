package br.dev.ricardomartins.odonto.acesso;

import br.dev.ricardomartins.odonto.shared.UsuarioIdentificado;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.CredentialsContainer;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

/** Principal guardado na sessão. O hash da senha é apagado logo após a autenticação. */
public final class UsuarioAutenticado implements UserDetails, CredentialsContainer, UsuarioIdentificado {

    private final UUID id;
    private final String nome;
    private final String email;
    private final Papel papel;
    private final boolean ativo;
    private String senhaHash;

    UsuarioAutenticado(UUID id, String nome, String email, Papel papel, boolean ativo, String senhaHash) {
        this.id = id;
        this.nome = nome;
        this.email = email;
        this.papel = papel;
        this.ativo = ativo;
        this.senhaHash = senhaHash;
    }

    static UsuarioAutenticado de(Usuario usuario) {
        return new UsuarioAutenticado(usuario.getId(), usuario.getNome(), usuario.getEmail(),
                usuario.getPapel(), usuario.isAtivo(), usuario.getSenhaHash());
    }

    @Override
    public UUID usuarioId() {
        return id;
    }

    public String nome() {
        return nome;
    }

    public Papel papel() {
        return papel;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + papel.name()));
    }

    @Override
    public String getPassword() {
        return senhaHash;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isEnabled() {
        return ativo;
    }

    @Override
    public void eraseCredentials() {
        senhaHash = null;
    }

    @Override
    public String toString() {
        return "UsuarioAutenticado[id=" + id + ", papel=" + papel + "]";
    }
}
