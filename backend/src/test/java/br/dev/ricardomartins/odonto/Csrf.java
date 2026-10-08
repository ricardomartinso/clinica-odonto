package br.dev.ricardomartins.odonto;

import jakarta.servlet.http.Cookie;
import java.util.UUID;
import java.util.stream.Stream;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

/**
 * Envia cookie {@code XSRF-TOKEN} e header {@code X-XSRF-TOKEN} com o mesmo valor, exatamente como o SPA.
 *
 * <p>Não usamos {@code SecurityMockMvcRequestPostProcessors.csrf()}: ele substitui o repositório de tokens
 * do filtro (singleton) por um de teste, e os testes seguintes deixam de exercitar a configuração real.
 */
public final class Csrf {

    private Csrf() {
    }

    public static RequestPostProcessor token() {
        return request -> {
            String token = UUID.randomUUID().toString();
            Cookie[] existentes = request.getCookies() == null ? new Cookie[0] : request.getCookies();
            request.setCookies(Stream.concat(Stream.of(existentes), Stream.of(new Cookie("XSRF-TOKEN", token)))
                    .toArray(Cookie[]::new));
            request.addHeader("X-XSRF-TOKEN", token);
            return request;
        };
    }
}
