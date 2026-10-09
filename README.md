# Clínica Odonto

[![CI](https://github.com/ricardomartinso/clinica-odonto/actions/workflows/ci.yml/badge.svg)](https://github.com/ricardomartinso/clinica-odonto/actions/workflows/ci.yml)

Sistema de gestão para clínica odontológica: pacientes e anamnese, agenda, prontuário com auditoria
e odontograma (notação FDI).

> Projeto de portfólio. **Todos os dados são fictícios.** CPF, telefone e anamnese são tratados como
> dados sensíveis desde o início: não aparecem em logs e só são expostos pela API quando necessário.

## Rodando do zero

Pré-requisito: Docker.

```bash
docker compose up --build
```

| Serviço       | Endereço                                   |
|---------------|--------------------------------------------|
| Aplicação     | http://localhost:3000                      |
| API           | http://localhost:8080 (também via `:3000/api`) |
| Documentação  | http://localhost:8080/swagger-ui.html      |

O backend sobe com o perfil `dev`, que carrega os dados fictícios.

| Usuário                 | Senha        | Papel    |
|-------------------------|--------------|----------|
| `helena@clinica.test`   | `clinica123` | DENTISTA |
| `rafael@clinica.test`   | `clinica123` | DENTISTA |
| `recepcao@clinica.test` | `clinica123` | RECEPCAO |

Para apagar o banco e recomeçar: `docker compose down -v`.

### Testando com curl

A API usa sessão (cookie) com proteção CSRF: o token chega no cookie `XSRF-TOKEN` e deve voltar no
header `X-XSRF-TOKEN` em requisições que alteram estado. O token é renovado no login.

```bash
curl -s -c cookies -b cookies localhost:8080/api/auth/me > /dev/null          # obtém o cookie CSRF
TOKEN=$(awk '$6=="XSRF-TOKEN"{print $7}' cookies)

curl -s -c cookies -b cookies -H "X-XSRF-TOKEN: $TOKEN" -H 'Content-Type: application/json' \
  -d '{"email":"helena@clinica.test","senha":"clinica123"}' localhost:8080/api/auth/login

curl -s -b cookies 'localhost:8080/api/pacientes?busca=conceicao'
```

## Desenvolvimento

Pré-requisitos: Java 21, Node 24 e Docker (os testes do backend usam Testcontainers com Postgres real).

```bash
docker compose up -d postgres                                        # só o banco

cd backend
./mvnw verify                                                        # build + todos os testes
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev                # API em :8080

cd frontend
npm install
npm run dev                                                          # app em :5173
npm test
```

### Contrato da API

`backend/openapi.json` é a fonte dos tipos TypeScript do frontend:

1. Um teste do backend falha se a API mudar sem o arquivo ser atualizado.
2. O CI do frontend falha se os tipos não forem regenerados a partir dele.

Ao alterar a API:

```bash
cd backend  && ./mvnw test -Dtest=ContratoOpenApiTest -Dopenapi.atualizar=true
cd frontend && npm run api:gerar
```

## API

Erros seguem [RFC 9457 (ProblemDetail)](https://www.rfc-editor.org/rfc/rfc9457). Erros de validação
trazem `erros: [{campo, mensagem}]`, nunca o valor rejeitado.

| Método | Caminho                               | Descrição                                        | Papéis    |
|--------|---------------------------------------|--------------------------------------------------|-----------|
| POST   | `/api/auth/login`                     | Login (`{email, senha}`)                         | público   |
| POST   | `/api/auth/logout`                    | Logout                                           | logado    |
| GET    | `/api/auth/me`                        | Usuário atual                                    | logado    |
| POST   | `/api/pacientes`                      | Cadastra paciente                                | todos     |
| GET    | `/api/pacientes?busca=&incluirInativos=&pagina=&tamanho=` | Pesquisa por nome (sem acento) ou CPF | todos |
| GET    | `/api/pacientes/{id}`                 | Detalhe (com `ETag`)                             | todos     |
| PUT    | `/api/pacientes/{id}`                 | Altera (exige `If-Match`)                        | todos     |
| POST   | `/api/pacientes/{id}/inativar`        | Inativa (não há exclusão)                        | todos     |
| POST   | `/api/pacientes/{id}/reativar`        | Reativa                                          | todos     |
| GET    | `/api/pacientes/{id}/anamnese`        | Anamnese atual e alertas clínicos                | DENTISTA  |
| PUT    | `/api/pacientes/{id}/anamnese`        | Cria (201) ou altera (200, exige `If-Match`)     | DENTISTA  |

**Concorrência:** leituras devolvem `ETag` com a versão do registro. Alterações exigem `If-Match`
com esse valor: sem o header a resposta é `428`, e com versão desatualizada é `412`. Assim uma edição
não sobrescreve outra em silêncio.

## Arquitetura

**Backend.** Monólito modular (Java 21, Spring Boot 3.5, PostgreSQL 17, Flyway), organizado por domínio:

```
backend/src/main/java/br/dev/ricardomartins/odonto/
├── shared/       erros (ProblemDetail), auditoria, value objects (Cpf), UUID v7
├── acesso/       usuários, papéis e Spring Security (sessão + CSRF)
└── pacientes/    cadastro e anamnese (auditada com Hibernate Envers)
```

- As fronteiras entre módulos são verificadas em teste com Spring Modulith.
- Classes internas de cada módulo são package-private.
- Migrations ficam em `db/migration`. O seed fictício fica em `db/seed` e é carregado só no perfil `dev`.

**Frontend.** React + TypeScript + Vite, TanStack Router/Query, shadcn/ui, react-hook-form + zod.
Servido por nginx na mesma origem da API. Detalhes em [frontend/README.md](frontend/README.md).

Decisões registradas:

- [ADR 0001 — Monólito modular](docs/adr/0001-monolito-modular.md)
- [ADR 0002 — Autenticação por sessão](docs/adr/0002-autenticacao-por-sessao.md)
- [ADR 0003 — Modelagem do domínio](docs/adr/0003-modelagem-do-dominio.md)

## Próximas etapas

- [x] Frontend: login, pacientes e anamnese
- [ ] Agenda (consultas sem sobreposição garantida no banco)
- [ ] Prontuário (evolução clínica e procedimentos por dente/face, auditados)
- [ ] Odontograma (FDI, permanentes e decíduos)

## Licença

[MIT](LICENSE)
