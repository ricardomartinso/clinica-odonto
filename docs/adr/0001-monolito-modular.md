# ADR 0001 — Monólito modular organizado por domínio

- Status: aceito
- Data: 2026-10-07

## Contexto

O sistema atende uma única clínica, com poucos usuários simultâneos e um único time. Os domínios
(pacientes, agenda, prontuário, odontograma) têm fronteiras claras, mas compartilham o mesmo banco
e o mesmo ciclo de deploy.

## Decisão

- Um único artefato Spring Boot, com um pacote por módulo: `acesso`, `pacientes`, `agenda`,
  `prontuario`, `odontograma`, mais um `shared` mínimo (erros, auditoria e value objects comuns como
  `Cpf`, `Dente`, `Face`).
- A API pública de cada módulo é o seu pacote raiz (tipicamente o `XxxService` e seus DTOs).
  Subpacotes (`web`, `internal`, ...) e classes package-private são detalhe de implementação.
- Entre módulos, referências apenas por ID (UUID). Nada de `@ManyToOne` atravessando módulos; a FK
  continua existindo no banco.
- Comunicação entre módulos por chamada síncrona à API pública ou por eventos Spring em processo
  (`@TransactionalEventListener`/`@EventListener`). Sem mensageria.
- As fronteiras são verificadas em teste com Spring Modulith (`ApplicationModules.verify()`), que
  quebra o build em caso de acesso a tipos internos de outro módulo ou de ciclos.

Dependências permitidas:

```
shared ← todos
agenda      → pacientes, acesso
prontuario  → pacientes, acesso
odontograma → prontuario, pacientes
```

## Consequências

- (+) Fronteiras explícitas e testáveis sem o custo operacional de microsserviços.
- (+) Extrair um módulo no futuro é viável, já que não há acoplamento por entidades JPA.
- (−) Algumas consultas que cruzam módulos ficam mais verbosas (dois acessos em vez de um join).
