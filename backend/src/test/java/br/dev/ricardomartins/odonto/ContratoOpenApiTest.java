package br.dev.ricardomartins.odonto;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import org.junit.jupiter.api.Test;

/**
 * O contrato publicado em {@code backend/openapi.json} gera os tipos do frontend. Este teste falha
 * quando a API muda sem que o arquivo seja atualizado. Para atualizar:
 *
 * <pre>./mvnw test -Dtest=ContratoOpenApiTest -Dopenapi.atualizar=true</pre>
 *
 * e depois, no frontend, {@code npm run api:gerar}.
 */
class ContratoOpenApiTest extends TesteDeIntegracao {

    private static final Path CONTRATO = Path.of("openapi.json");

    private final ObjectMapper json = new ObjectMapper()
            .enable(SerializationFeature.INDENT_OUTPUT)
            .enable(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS);

    @Test
    void contratoPublicadoEstaAtualizado() throws Exception {
        String gerado = mvc.perform(get("/v3/api-docs")).andReturn().getResponse().getContentAsString();
        String atual = json.writeValueAsString(json.readValue(gerado, Map.class)) + "\n";

        assertThat(json.readTree(atual).at("/components/schemas"))
                .as("todo schema de objeto deve ter type object")
                .allSatisfy(schema -> {
                    if (schema.has("properties")) {
                        assertThat(schema.at("/type").asText()).isEqualTo("object");
                    }
                });

        if (Boolean.getBoolean("openapi.atualizar")) {
            Files.writeString(CONTRATO, atual);
            return;
        }

        assertThat(CONTRATO).as("Contrato ausente; gere com -Dopenapi.atualizar=true").exists();
        assertThat(atual)
                .as("A API mudou e backend/openapi.json está desatualizado. Rode "
                        + "./mvnw test -Dtest=ContratoOpenApiTest -Dopenapi.atualizar=true e, no frontend, "
                        + "npm run api:gerar")
                .isEqualTo(Files.readString(CONTRATO));
    }
}
