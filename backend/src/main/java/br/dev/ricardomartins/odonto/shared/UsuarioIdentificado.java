package br.dev.ricardomartins.odonto.shared;

import java.util.Optional;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * Implementado pelo principal autenticado. Permite que a auditoria descubra o usuário atual sem que
 * {@code shared} dependa do módulo {@code acesso}.
 */
public interface UsuarioIdentificado {

    UUID usuarioId();

    static Optional<UUID> atual() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof UsuarioIdentificado usuario) {
            return Optional.of(usuario.usuarioId());
        }
        return Optional.empty();
    }
}
