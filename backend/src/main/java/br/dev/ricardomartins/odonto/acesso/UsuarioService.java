package br.dev.ricardomartins.odonto.acesso;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** API pública do módulo de acesso para os demais módulos. */
@Service
@Transactional(readOnly = true)
public class UsuarioService {

    private final UsuarioRepository usuarios;

    UsuarioService(UsuarioRepository usuarios) {
        this.usuarios = usuarios;
    }

    /** Nome de exibição dos usuários informados (ex.: autores de registros clínicos). */
    public Map<UUID, String> nomes(Collection<UUID> ids) {
        if (ids.isEmpty()) {
            return Map.of();
        }
        return usuarios.findAllById(ids).stream().collect(Collectors.toMap(Usuario::getId, Usuario::getNome));
    }
}
