# Frontend

React + TypeScript + Vite, TanStack Router/Query, shadcn/ui, react-hook-form + zod.

```bash
npm install
npm run dev          # http://localhost:5173 (proxy de /api para o backend em :8080)
npm test             # Vitest + Testing Library + MSW
npm run lint         # oxlint
npm run typecheck
npm run api:gerar    # regenera src/api/schema.d.ts a partir de ../backend/openapi.json
```

## Organização

```
src/
├── api/          cliente HTTP (sessão, CSRF, ETag, ProblemDetail) e tipos gerados do OpenAPI
├── features/     código por domínio (auth, pacientes): consultas, formulários, componentes
├── routes/       rotas por arquivo (TanStack Router); _app = área autenticada
├── components/   componentes compartilhados; ui/ = shadcn
├── lib/          formatação e validação (CPF, telefone, datas)
└── test/         API falsa (MSW) e helpers de teste
```

## Decisões

- **Tipos da API gerados do contrato** (`backend/openapi.json`), nunca escritos à mão. O CI falha se
  o contrato mudar sem regenerar.
- **Mesma origem**: em dev o Vite faz proxy de `/api`; no Docker, o nginx. Sessão por cookie e CSRF
  funcionam sem CORS.
- **Concorrência**: a versão (ETag) lida é enviada no `If-Match`. Em conflito (412), a tela recarrega
  os dados atuais e avisa o usuário, sem sobrescrever a alteração de outra pessoa.
- **Testes de tela inteira**: a aplicação é renderizada com rotas, guards e QueryClient reais contra
  uma API falsa em memória (MSW) que reproduz as regras do backend relevantes para a UI.
