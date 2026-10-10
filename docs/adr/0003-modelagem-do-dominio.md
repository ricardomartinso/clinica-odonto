# ADR 0003 — Modelagem do domínio

- Status: aceito (pontos marcados com ⚑ a validar com o dentista)
- Data: 2026-10-07

## Convenções gerais

- IDs UUID v7 (ordenável por tempo; evita enumeração de pacientes pela URL).
- `timestamptz` ↔ `Instant` para momentos; `date` ↔ `LocalDate` para datas. Fuso da clínica:
  `America/Sao_Paulo`.
- Colunas `criado_em/por` e `atualizado_em/por` em todas as tabelas (Spring Data Auditing).
- `@Version` nos agregados editáveis, exposto via HTTP: leituras devolvem a versão como `ETag` e
  alterações exigem `If-Match` (ausente → `428`, desatualizado → `412`). Corrida entre a conferência e o
  flush ainda é barrada pelo `@Version` → `409`.
- Nenhum dado clínico ou cadastral é apagado fisicamente: inativação ou anulação com motivo.
- Hibernate Envers em `Anamnese`, `EvolucaoClinica`, `ProcedimentoClinico` e `Achado`, com entidade
  de revisão própria: `revisao(id, momento, usuario_id)`.

## acesso

**Usuario**: `id`, `nome`, `email` (login, único), `senha_hash`, `papel` (`DENTISTA` | `RECEPCAO`),
`cro_numero`, `cro_uf`, `ativo`. CHECK: CRO obrigatório se e somente se `papel = DENTISTA`.
Suporta mais de um dentista ⚑. Usuários criados via seed nesta fase.

## pacientes

**Paciente**: `id`, `nome`, `nome_social?`, `data_nascimento`, `cpf?`, `celular`, `email?`,
`endereco?` (embutido), `responsavel?` (embutido: nome, cpf, telefone, parentesco), `observacoes?`,
`ativo`.

- CPF: `char(11)` só dígitos, dígitos verificadores validados, único quando presente (índice parcial).
  Opcional porque crianças podem não tê-lo em mãos no cadastro.
- Responsável legal obrigatório para menores de 18 anos na data do cadastro.
- Busca por nome sem acento (`unaccent` + `pg_trgm`) e por CPF exato.
- Listagem devolve um resumo com CPF mascarado; CPF completo apenas no detalhe.

**Anamnese** (1:1 com Paciente, auditada): colunas tipadas para itens críticos (alergias + descrição,
anticoagulante, diabetes, hipertensão, cardiopatia, coagulopatia, gestante + semanas, fumante,
bisfosfonatos, reação prévia à anestesia), medicamentos em uso e observações.

- Respostas `Boolean` anuláveis: `null` = não perguntado, distinto de "não".
- Alertas clínicos derivados dos itens críticos.
- Histórico via Envers. Endpoint próprio; nunca embutida no detalhe do paciente.
- Acesso apenas para `DENTISTA` ⚑.

## agenda

**Consulta**: `id`, `paciente_id`, `dentista_id`, `inicio`, `fim`, `status`, `observacao?`,
`motivo_cancelamento?`.

- Estados: `AGENDADA → CONFIRMADA → REALIZADA`; `AGENDADA|CONFIRMADA → CANCELADA` (motivo
  obrigatório) ou `FALTA` (somente após o início). Estados finais são imutáveis.
- Sem sobreposição por dentista, garantido no banco (resistente a condições de corrida):

  ```sql
  EXCLUDE USING gist (dentista_id WITH =, tstzrange(inicio, fim) WITH &&)
    WHERE (status NOT IN ('CANCELADA', 'FALTA'))
  ```

## prontuario

**Procedimento** (catálogo, dado de referência em migration versionada): `id`, `nome`,
`abrangencia` (`BOCA` | `ARCADA` | `DENTE` | `FACE`), `ativo`. Conteúdo do catálogo e abrangência por
sextante ⚑ (hoje: 21 procedimentos comuns, sem códigos TUSS).

**EvolucaoClinica** (auditada): `id`, `paciente_id`, `autor_id`, `data_atendimento` (não futura),
`texto`, `editada_em?`, `anulada_em?`, `anulada_por?`, `motivo_anulacao?`.

- Editável e anulável apenas pelo autor ⚑, sem prazo; cada versão fica no Envers e é exposta em
  `GET …/evolucoes/{id}/historico`. Sem exclusão.

**ProcedimentoClinico** (auditado): `id`, `paciente_id`, `procedimento_id`, `dente?`, `faces`,
`arcada?`, `status`, `observacao?`, `evolucao_id?`, `realizado_em?`, `realizado_por?`, `motivo?`.

- Consistência com a abrangência: `FACE` exige dente e ≥ 1 face; `DENTE` exige dente e nenhuma face;
  `ARCADA` exige arcada; `BOCA` nenhum dos três.
- Estados: `PLANEJADO → REALIZADO | CANCELADO`; `REALIZADO → ANULADO` (erro de registro). Cancelar e
  anular exigem motivo; só quem realizou pode anular.

Decisões aprovadas (2026-10-09):

1. **Realização só dentro de uma evolução**: todo procedimento feito fica documentado em um registro
   clínico. Garantido também por CHECK no banco (`REALIZADO`/`ANULADO` ⇔ evolução, data e autor).
2. **Registro de atendimento atômico**: `POST …/evolucoes` cria a evolução, realiza os planejados
   informados e inclui os não planejados numa única transação.
3. **Anular a evolução anula em cascata** os procedimentos realizados nela, com o mesmo motivo.

## odontograma

**Dente** (value object, `shared`): código FDI. Permanentes 11–48 (quadrantes 1–4, posições 1–8) e
decíduos 51–85 (quadrantes 5–8, posições 1–5) ⚑. CHECK no banco.

**Face** (enum, `shared`): `M`, `D`, `O_I`, `V`, `L_P`. O rótulo depende do dente: anterior → I,
posterior → O; superior → P, inferior → L. Cinco faces canônicas impedem estados inválidos
(ex.: "incisal em molar").

**Achado** (auditado): `id`, `paciente_id`, `dente`, `faces`, `tipo` (CARIE, RESTAURACAO, AUSENTE,
COROA, IMPLANTE, ENDODONTIA, FRATURA, SELANTE, ...), `observado_em`, `registrado_por`,
`resolvido_em?`, `procedimento_id?`.

- `AUSENTE` não tem faces e impede planejar procedimento de `FACE` naquele dente.
- Ao receber `ProcedimentoRealizado`, resolve o achado vinculado.

**Odontograma** é uma projeção, não uma entidade: por dente, achados ativos + procedimentos
planejados (vermelho) + realizados (azul). Uma única fonte de verdade; o estado em uma data passada
sai de `observado_em`/`resolvido_em`.

## Permissões

| Recurso                  | DENTISTA | RECEPCAO      |
|--------------------------|----------|---------------|
| Cadastro de paciente     | RW       | RW            |
| Anamnese                 | RW       | sem acesso ⚑  |
| Agenda                   | RW       | RW            |
| Prontuário / odontograma | RW       | sem acesso    |

## Dados sensíveis

- Sem `toString` com CPF, telefone ou anamnese; sem log de corpo de requisição nem de parâmetros SQL.
- ProblemDetail de validação informa campo e mensagem, nunca o valor rejeitado.
- Seed com CPFs gerados (dígitos verificadores válidos, sem nenhum outro dado real associado).
