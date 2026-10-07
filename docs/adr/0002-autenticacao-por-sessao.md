# ADR 0002 — Autenticação por sessão (cookie) em vez de JWT

- Status: aceito
- Data: 2026-10-07

## Contexto

Um SPA React consome a API do próprio monólito, servido sob o mesmo domínio (em desenvolvimento, via
proxy do Vite). Há dois papéis: `DENTISTA` e `RECEPCAO`. Os dados tratados são sensíveis (dados de
saúde, LGPD art. 11).

## Decisão

Sessão HTTP gerenciada pelo Spring Security:

- Cookie de sessão `HttpOnly`, `SameSite=Lax` (`Secure` fora do perfil de desenvolvimento).
- Proteção CSRF ativa, no padrão cookie → header (`XSRF-TOKEN` / `X-XSRF-TOKEN`) adequado a SPAs.
- Login via `POST /api/auth/login` (JSON), logout via `POST /api/auth/logout`.
- Senhas com `DelegatingPasswordEncoder` (bcrypt por padrão).

## Alternativa considerada: JWT

Os benefícios do JWT (stateless, validação distribuída entre serviços) não se aplicam a um monólito.
Os custos sim: revogação imediata exige blacklist, e o armazenamento do token no navegador fica
exposto a XSS (`localStorage`) ou volta a depender de cookie + CSRF de qualquer forma.

## Consequências

- (+) Logout e desativação de usuário têm efeito imediato.
- (+) Nenhum token acessível via JavaScript.
- (−) Estado no servidor: sessões em memória se perdem em restart e não escalam horizontalmente.
  Mitigação quando necessário: Spring Session JDBC (mesmo Postgres), uma dependência a mais.
