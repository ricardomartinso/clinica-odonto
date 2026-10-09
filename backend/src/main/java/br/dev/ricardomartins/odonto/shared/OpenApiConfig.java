package br.dev.ricardomartins.odonto.shared;

import io.swagger.v3.core.converter.AnnotatedType;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.oas.models.servers.Server;
import java.lang.annotation.Annotation;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springdoc.core.customizers.PropertyCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * O contrato OpenAPI é a fonte dos tipos TypeScript do frontend, então precisa dizer a verdade sobre
 * presença e nulidade dos campos:
 * <ul>
 *   <li>campos anotados com {@code @Nullable} aceitam {@code null}; os demais, não;</li>
 *   <li>em schemas que só aparecem em respostas, todo campo é obrigatório (o Jackson sempre serializa
 *       todos os componentes do record, inclusive os nulos).</li>
 * </ul>
 */
@Configuration(proxyBeanMethods = false)
class OpenApiConfig {

    @Bean
    OpenAPI openApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Clínica Odonto API")
                        .version("v1")
                        .description("API do sistema de gestão da clínica. Todos os dados são fictícios."))
                .servers(List.of(new Server().url("/")));
    }

    /** O springdoc já trata {@code @Nullable} em escalares, mas ignora em propriedades que são {@code $ref}. */
    @Bean
    PropertyCustomizer referenciasAnulaveis() {
        return (propriedade, tipo) -> {
            if (propriedade.get$ref() == null || !anotadoComNullable(tipo)) {
                return propriedade;
            }
            return new Schema<>().oneOf(List.of(
                    new Schema<>().$ref(propriedade.get$ref()),
                    new Schema<>().types(Set.of("null"))));
        };
    }

    @Bean
    OpenApiCustomizer respostasComCamposObrigatorios() {
        return openApi -> {
            @SuppressWarnings("rawtypes")
            Map<String, Schema> schemas = openApi.getComponents().getSchemas();
            Set<String> usadosEmEntrada = new HashSet<>();
            openApi.getPaths().values().stream()
                    .flatMap(caminho -> caminho.readOperations().stream())
                    .filter(operacao -> operacao.getRequestBody() != null)
                    .flatMap(operacao -> operacao.getRequestBody().getContent().values().stream())
                    .forEach(midia -> coletarReferencias(midia.getSchema(), schemas, usadosEmEntrada));

            schemas.forEach((nome, schema) -> {
                // Ao tratar @Nullable numa propriedade $ref, o springdoc marca o schema referenciado
                // inteiro como "null"; a nulidade já está na propriedade (oneOf), então restauramos.
                if (schema.getProperties() != null && schema.getTypes() != null
                        && schema.getTypes().contains("null")) {
                    schema.setTypes(new HashSet<>(Set.of("object")));
                }
                if (!usadosEmEntrada.contains(nome) && schema.getProperties() != null) {
                    schema.setRequired(new ArrayList<>(schema.getProperties().keySet()));
                }
            });
        };
    }

    private static boolean anotadoComNullable(AnnotatedType tipo) {
        Annotation[] anotacoes = tipo.getCtxAnnotations();
        return anotacoes != null && Stream.of(anotacoes)
                .anyMatch(anotacao -> anotacao.annotationType().getSimpleName().equals("Nullable"));
    }

    @SuppressWarnings({"rawtypes", "unchecked"})
    private static void coletarReferencias(Schema schema, Map<String, Schema> schemas, Set<String> visitados) {
        if (schema == null) {
            return;
        }
        if (schema.get$ref() != null) {
            String nome = schema.get$ref().substring(schema.get$ref().lastIndexOf('/') + 1);
            if (visitados.add(nome)) {
                coletarReferencias(schemas.get(nome), schemas, visitados);
            }
            return;
        }
        Stream.of(schema.getProperties() == null ? List.<Schema>of() : schema.getProperties().values(),
                        schema.getOneOf() == null ? List.<Schema>of() : schema.getOneOf(),
                        schema.getAnyOf() == null ? List.<Schema>of() : schema.getAnyOf(),
                        schema.getAllOf() == null ? List.<Schema>of() : schema.getAllOf(),
                        schema.getItems() == null ? List.<Schema>of() : List.of(schema.getItems()))
                .flatMap(colecao -> ((java.util.Collection<Schema>) colecao).stream())
                .forEach(filho -> coletarReferencias(filho, schemas, visitados));
    }
}
