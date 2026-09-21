---
created_at: "2026-09-21T09:21:11-03:00"
updated_at: "2026-09-21T09:22:21-03:00"
---

# Público-alvo do aviso (notice-audience) - Design

## Visão Geral

O admin passa a escolher, ao criar um aviso em `/admin/avisos/novo`, quem o recebe: **Todos**, **Alunos** ou **Administradores**. Hoje o broadcast (`admin-notice-broadcast`) cria uma notificação `NOTICE` para todo usuário ativo. Com esta mudança, só o grupo escolhido recebe.

- **Resultado esperado:** um aviso para "Alunos" cria notificações só para usuários ativos com `role = MEMBER`; "Administradores" só para `role = ADMIN`; "Todos" mantém o comportamento atual.
- **Para quem:** o admin que envia. Os destinatários continuam vendo o aviso no sino, sem mudança.
- **Reversão deliberada de escopo:** o PRD de `admin-notice-broadcast` colocou a segmentação fora de escopo (apenas "todos os usuários ativos"). Esta feature a reverte; o adendo em `admin-notice-broadcast` registra isso.
- **Fora de escopo:** persistir o público no histórico, filtros por status ou por academia, público múltiplo combinado, e-mail/push. O pipeline de entrega (RabbitMQ fanout, SSE), o sino e as tabelas não mudam.

## Características Arquiteturais

**Priorizadas (top 3):**

| Característica | Por quê | Critério mensurável |
|---|---|---|
| Correção do conjunto de destinatários | Aviso ao público errado é ruído ou vazamento de mensagem interna | Para cada audiência, destinatários = exatamente os usuários ativos do papel correspondente (teste por audiência) |
| Compatibilidade retroativa | O contrato atual já está em uso pelo frontend e por testes | Body sem `audience` produz o mesmo resultado de hoje (teste business-flow) |
| Camadas limpas | Contexto `notification` não pode depender do contexto `user` | `pnpm --filter backend fit:validate-dependencies` sem violação |

**Consideradas, não priorizadas:** performance (fan-out síncrono em blocos de 500 continua válido; gatilho de revisão de `admin-notice-broadcast` mantido), escalabilidade de audiência (só três valores).

## Componentes

- **`NoticeAudience`** (domínio `notification`): value object com os valores `ALL`, `MEMBERS`, `ADMINS`. Responsabilidade: representar o público de um aviso sem conhecer `Role`. Expõe `ALL` como padrão.
- **`ActiveRecipientsProvider`** (porta, `application/provider`): passa a receber `NoticeAudience` e devolver os IDs dos usuários ativos daquele público. O contrato de devolver só IDs não muda.
  - **Implementação Prisma:** `status = activated`, `deleted_at = null` e, conforme a audiência, `role = MEMBER`, `role = ADMIN` ou nenhum filtro de papel. A tradução audiência para papel vive só aqui.
  - **Implementação in-memory:** mesmo filtro; os dados de teste passam a carregar o papel.
- **`BroadcastNoticeUseCase`:** recebe `audience` e repassa ao provider. Fan-out em blocos de 500, `saveMany` e publicação seguem como estão.
- **Controller de broadcast:** body ganha `audience: z.enum(["ALL","MEMBERS","ADMINS"]).default("ALL")`; valor inválido responde 400. A resposta continua `{ recipients }`. O schema OpenAPI é atualizado e os tipos de `@repo/api-types` são regenerados com `pnpm generate:types`.
- **Frontend (`features/notices`):**
  - `notice-schema`: campo `audience` (padrão `ALL`).
  - `AudienceSelector` (novo): grupo de rádio em cartões, três opções, `<fieldset>` com `<legend>`, `input type=radio` visualmente oculto (sr-only) dentro de `<label>`.
  - `NoticeForm`: renderiza o seletor entre "Mensagem" e o botão "Enviar aviso".
  - `NoticePreview`: mostra a linha "Público: X".
  - `use-broadcast-notice`: envia `audience` no body.
  - Página `/admin/avisos/novo`: subtítulo passa de "todos os usuários" para "o público escolhido".

- **Documentação:** adendo curto no spec e no PRD de `admin-notice-broadcast` registrando que a segmentação deixou de ser out-of-scope e apontando para este design.

Mapeamento de rótulos (frontend): `ALL` = "Todos", `MEMBERS` = "Alunos", `ADMINS` = "Administradores".

## Fluxo de Dados

1. O admin escolhe o público e envia; o hook faz `POST /api/v1/notifications/broadcast` com `{ title, message, audience }`.
2. O controller valida o body (`audience` ausente vira `ALL`) e chama o use case.
3. O use case pede ao provider os IDs ativos da audiência, cria as notificações em blocos de 500 e publica em `notificationCreated`.
4. A resposta `{ recipients }` alimenta o toast "Aviso enviado para N usuários."

O remetente não recebe tratamento especial: recebe o aviso somente se a audiência incluir administradores.

## Especificação Visual

**Artefato curado:** `mockups/notice-audience-visual.md`

**Fonte de design original:** nenhuma; layout definido via mockup do companion (opção B escolhida pelo usuário).

**Decisões visuais (norte, não pixel-final):**
- Layout: três cartões de rádio em linha, dentro do card do formulário, entre "Mensagem" e o botão; o cartão selecionado usa borda `primary` com anel de 1px, como os planos em `/assinatura`.
- Conteúdo de cada cartão: título e uma linha de descrição ("Alunos e administradores ativos", "Somente alunos ativos", "Somente administradores ativos").
- Preview: linha "Público: Alunos" em mono uppercase abaixo do item de notificação.
- Tema escuro é o padrão do app; tokens do tema VOLT (ver artefato).

**Fidelidade:** o mockup é um norte; a fidelidade final é construída na task de implementação.

## Decisões Arquiteturais

### D1. `NoticeAudience` na porta do provider

- **Contexto:** o filtro por papel precisa chegar à query sem que `notification` dependa de `user`.
- **Decisão:** value object `NoticeAudience` no domínio de notificação, recebido pela porta; a infra Prisma traduz para `role`.
- **Justificativa técnica:** preserva a regra de dependência e filtra na query, sem carregar usuários para descartar.
- **Justificativa de negócio:** evita retrabalho quando surgirem novos públicos e mantém o contexto isolado.
- **Trade-offs aceitos:** um value object e uma mudança de assinatura da porta (duas implementações e testes). Alternativas descartadas: `roles: Role[]` na porta (vaza `Role`) e filtro no use case (carrega usuários inteiros e muda o contrato de IDs).

### D2. `audience` opcional com padrão `ALL`

- **Decisão:** ausente equivale a `ALL`.
- **Justificativa de negócio:** não quebra o cliente nem os testes atuais.
- **Trade-offs aceitos:** contrato menos explícito que um campo obrigatório.

### D3. Público não persistido

- **Decisão:** o `audience` só filtra destinatários; não há coluna nem tabela nova.
- **Justificativa de negócio:** não existe histórico de avisos; guardar o público sem tela que o leia é YAGNI.
- **Trade-offs aceitos:** não é possível saber depois para quem um aviso foi. Gatilho de revisão: quando existir histórico de avisos.

### D4. Remetente segue o filtro

- **Decisão:** sem exceção para o admin remetente (revisa a regra D5 de `admin-notice-broadcast`, que o incluía sempre por ser "todos").
- **Trade-offs aceitos:** um admin que envia só para "Alunos" não vê o próprio aviso no sino.

### D5. Seletor em cartões de rádio

- **Decisão:** cartões com descrição (padrão de `/assinatura`), em vez do `SegmentedControl` dos filtros.
- **Justificativa de negócio:** o aviso é irreversível e o público precisa ser explícito; a descrição reduz envio ao grupo errado.
- **Trade-offs aceitos:** ocupa mais espaço no formulário; o `SegmentedControl` existente não é reusado e o app não tem `RadioGroup` compartilhado (o componente é próprio da feature).

## Riscos

| Risco | Impacto | Prob. | Score | Mitigação |
|---|---|---|---|---|
| Provider in-memory sem papel diverge do Prisma | 2 | 2 | 4 🟡 | Teste contratual por audiência rodando nas duas implementações |
| Tipos gerados desatualizados após mudar o schema | 2 | 1 | 2 🟢 | `pnpm generate:types` na task e `tsc:check` no gate |
| Seed com poucos admins mascara erro de filtro | 1 | 2 | 2 🟢 | Testes criam os usuários de cada papel explicitamente |

## Testes

- **Runner backend:** Vitest 4 (`test:run`, `test:business-flow`, `test:e2e:prisma`); framework HTTP Fastify 5, validação Zod 4, persistência Prisma.
- **Runner frontend:** Vitest com MSW; Next.js 16 / React 19.
- **Unitários:** `NoticeAudience`; provider in-memory por audiência; use case repassa a audiência e cobre o caso sem membros na audiência (0 destinatários).
- **Business-flow:** POST com cada audiência entrega só ao papel certo; POST sem `audience` equivale a `ALL`; `audience` inválido responde 400; 403 para `MEMBER` continua.
- **E2E Prisma:** filtro por papel e exclusão de inativos/removidos.
- **Frontend:** `AudienceSelector` (seleção, padrão Todos, teclado e leitor de tela), `NoticeForm` envia `audience`, `NoticePreview` mostra o público, handler MSW aceita o campo.
- **Gate final:** `pnpm biome:fix`, `pnpm tsc:check`, `pnpm test:run`, `pnpm build`, `fit:validate-dependencies` e `test:fitness`.
