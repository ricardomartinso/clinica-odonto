package br.dev.ricardomartins.odonto.acesso;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContextHolderStrategy;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
class AuthController {

    record LoginRequest(@NotBlank String email, @NotBlank String senha) {

        @Override
        public String toString() {
            return "LoginRequest[credenciais omitidas]";
        }
    }

    record UsuarioLogadoResponse(UUID id, String nome, String email, Papel papel) {

        static UsuarioLogadoResponse de(UsuarioAutenticado usuario) {
            return new UsuarioLogadoResponse(usuario.usuarioId(), usuario.nome(), usuario.getUsername(),
                    usuario.papel());
        }
    }

    private final SecurityContextHolderStrategy contextHolder = SecurityContextHolder.getContextHolderStrategy();
    private final AuthenticationManager authenticationManager;
    private final SessionAuthenticationStrategy sessionAuthenticationStrategy;
    private final SecurityContextRepository securityContextRepository;

    AuthController(AuthenticationManager authenticationManager,
            SessionAuthenticationStrategy sessionAuthenticationStrategy,
            SecurityContextRepository securityContextRepository) {
        this.authenticationManager = authenticationManager;
        this.sessionAuthenticationStrategy = sessionAuthenticationStrategy;
        this.securityContextRepository = securityContextRepository;
    }

    @PostMapping("/login")
    UsuarioLogadoResponse login(@Valid @RequestBody LoginRequest login, HttpServletRequest request,
            HttpServletResponse response) {
        Authentication autenticacao = authenticationManager.authenticate(
                UsernamePasswordAuthenticationToken.unauthenticated(login.email(), login.senha()));

        sessionAuthenticationStrategy.onAuthentication(autenticacao, request, response);
        SecurityContext contexto = contextHolder.createEmptyContext();
        contexto.setAuthentication(autenticacao);
        contextHolder.setContext(contexto);
        securityContextRepository.saveContext(contexto, request, response);

        return UsuarioLogadoResponse.de((UsuarioAutenticado) autenticacao.getPrincipal());
    }

    @GetMapping("/me")
    UsuarioLogadoResponse usuarioAtual(@AuthenticationPrincipal UsuarioAutenticado usuario) {
        return UsuarioLogadoResponse.de(usuario);
    }

    /** Mesma resposta para e-mail inexistente, senha errada ou usuário inativo: evita enumeração de contas. */
    @ExceptionHandler(AuthenticationException.class)
    ProblemDetail credenciaisInvalidas() {
        ProblemDetail problema = ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, "E-mail ou senha inválidos.");
        problema.setTitle("Credenciais inválidas");
        return problema;
    }
}
