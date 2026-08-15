---
created_at: "2026-08-15T18:30:23-03:00"
updated_at: "2026-08-15T18:30:23-03:00"
---

# Design — Histórico de Atividade no Perfil (/perfil)

## Visão Geral

Replicar a funcionalidade de histórico de atividades — já entregue na tela admin de detalhes do usuário (`historico-atividade-usuario`) — na tela `/perfil` (visão do próprio usuário), com os **mesmos detalhes e decisões de paginação**: os 7 tipos de evento de conta + `CHECK_IN` sintético, ordenados por data decrescente, limitados aos últimos 20 itens, sem paginação ("carregar mais") na v1.

Abordagem aprovada: **Mirror + reuso**. Um novo endpoint próprio `GET /users/me/activity` (apenas usuário logado) reusa o `GetUserActivityUseCase`/`UserActivityDao` existentes sem tocar no write path (subscriber, `UserActivityRepository`, domain events, schema Prisma) nem no endpoint admin. No frontend, o `ActivityTab` e o hook de atividade são movidos para um módulo compartilhado `features/activity/`, e a página `/perfil` passa a ser tabbed ("Visão geral" | "Atividade") com o feed lazy-load na aba.

## Características Arquiteturais

**Priorizadas (top 3):**

| Característica | Por quê | Critério mensurável |
|---|---|---|
| Consistência (padrão já estabelecido) | Reuso integral do padrão existente — endpoint espelha `/users/me`, use case/DAO reaproveitados, um único componente de feed compartilhado | Nenhuma duplicação de lógica de leitura nem de markup do feed; admin e perfil renderizam pelo mesmo `ActivityTab` |
| Segurança/Autorização | Cada usuário enxerga apenas o próprio histórico; `userId` vem de `req.user.sub.id`, nunca de input do cliente | Teste garante 200 apenas para o próprio usuário e 401 sem token; nenhum caminho expõe atividade de terceiros |
| Confiabilidade do registro | Herdada intacta do write path existente — falha em gravar atividade nunca propaga para a use case de origem | Nenhuma alteração nesse caminho; garantia pré-existente preservada |

**Consideradas, não priorizadas:** simplicidade de leitura (já satisfeita pelo mesmo DAO, sem cache dedicado), manutenibilidade sem duplicação (obtida pela abordagem A, mas não dirigiu as decisões).

## Decisões Arquiteturais

### D1. Endpoint próprio `GET /users/me/activity` em vez de generalizar o endpoint admin

- **Contexto:** o endpoint `GET /users/:userId/activity` é `isProtected: true, onlyAdmin: true`. A visão do próprio usuário foi explicitamente excluída da feature anterior ("apenas visão admin"). Já existe o padrão `/users/me` (perfil, métricas, troca de senha) com `isProtected: true`.
- **Decisão:** novo controller `get-my-activity.controller.ts` em `GET /users/me/activity`, `isProtected: true` (sem `onlyAdmin`), `userId` resolvido de `req.user.sub.id` e delegado ao `GetUserActivityUseCase` existente. A rota estática tem precedência sobre a paramétrica no Fastify — mesmo padrão já em produção com `/users/me` vs `/users/:userId`.
- **Justificativa técnica:** reuso total do read path; separa os dois planos de autorização (admin-only vs dono) em handlers distintos.
- **Justificativa de negócio:** zero esforço novo de leitura; a característica priorizada de Segurança/Autorização exige que o boundary do próprio usuário seja declarativo (`isProtected`), não uma checagem manual dentro do handler admin.
- **Trade-offs aceitos:** um endpoint a mais para manter; a superfície admin permanece intacta (sem mudança no endpoint existente).

### D2. Módulo frontend compartilhado `features/activity/` com `ActivityTab` único

- **Contexto:** `ActivityTab` e os helpers de formatação vivem em `features/admin/components/user-detail/`; o perfil precisa do mesmo feed.
- **Decisão:** mover `ActivityTab`, `user-detail-format` e o hook para `features/activity/` (api/ + components/). Admin e perfil importam do mesmo lugar. Sem duplicação de markup nem de formatação.
- **Justificativa técnica:** um único componente presentacional com props estáveis (`events`, `isLoading`, `isError`) — o move é seguro e coberto pelos testes existentes do `ActivityTab`.
- **Justificativa de negócio:** consistência visual por construção — divergência de layout entre admin e perfil fica impossível.
- **Trade-offs aceitos:** o move toca a tela admin (churn moderado, mitigado por testes já existentes do componente e do `UserDetailTabs`).

### D3. Hook único `useUserActivity(userId?: string)` em vez de um hook por superfície

- **Contexto:** o hook admin atual é `useUserActivity(userId, options)` chamando `GET /users/{userId}/activity`.
- **Decisão:** generalizar o hook para aceitar `userId` opcional: `undefined` → `GET /users/me/activity`; presente → `GET /users/{userId}/activity`. Query key `["user-activity", userId ?? "me"]` evita colisão de cache entre admin e perfil.
- **Justificativa técnica:** um único ponto de definição de query state (loading/erro/data), sem lógica duplicada.
- **Justificativa de negócio:** menor superfície de manutenção; o perfil obtém lazy-load idêntico ao admin (`enabled: activeTab === "atividade"`).
- **Trade-offs aceitos:** o hook carrega um ramo condicional de path (pequeno custo de legibilidade).

## Fluxo

1. Usuário autenticado abre `/perfil` e clica na aba "Atividade".
2. O frontend executa `useUserActivity(undefined, { enabled: activeTab === "atividade" })` (lazy — só busca ao abrir a aba, mesmo padrão do `UserDetailTabs` admin).
3. `GET /users/me/activity` chega ao backend; o guard `isProtected` valida o token e o controller resolve `userId` de `req.user.sub.id`.
4. `GetUserActivityUseCase` → `UserActivityDao` mescla `UserActivityEvent` + `CheckIn` por `userId`, ordena por data desc e limita a 20 (mesmo shape `UserActivityListItem`).
5. Resposta `{ events }` → `ActivityTab` agrupa por data ("Hoje"/"Ontem"/data completa), escolhe ícone por `type` e exibe descrição + horário. Estados de loading (skeleton), erro (inline, distinto do vazio) e vazio (`EmptyState`) herdados da `ActivityTab`.

## Estrutura de Componentes

**Backend — novo:**

| Arquivo | Papel |
|---|---|
| `user/infra/controller/get-my-activity.controller.ts` | `GET /users/me/activity`, `isProtected: true`, `userId` de `req.user.sub.id`, delega ao `GetUserActivityUseCase`; resposta `{ events }` |

**Backend — modificado:**

| Arquivo | Mudança |
|---|---|
| `user/infra/controller/routes/user-routes.ts` | + const `MY_ACTIVITY = "/users/me/activity"` |
| `shared/infra/ioc/module/service-identifier/user-types.ts` | + símbolo do controller novo |
| `shared/infra/ioc/module/user/user-module.ts` | Bind do controller novo |
| OpenAPI spec (backend) + `packages/api-types` | Rota documentada e tipos regenerados via `pnpm generate:types` |

**Backend — reuso sem alteração:** `GetUserActivityUseCase` (limit 20), `UserActivityDao`, shape `UserActivityListItem`, `RecordUserActivitySubscriber`, `UserActivityRepository`, schema Prisma `UserActivityEvent`, endpoint admin `GET /users/:userId/activity`.

**Frontend — novo (módulo compartilhado):**

| Arquivo | Papel |
|---|---|
| `features/activity/api/use-user-activity.ts` | Hook único `useUserActivity(userId?: string, options)` — movido de `features/admin/api/` e generalizado (D3) |
| `features/activity/components/activity-tab.tsx` | `ActivityTab` presentacional — movido de `features/admin/components/user-detail/` |
| `features/activity/components/user-detail-format.ts` | Helpers de formatação (agrupamento/horário) — movidos junto |

**Frontend — modificado:**

| Arquivo | Mudança |
|---|---|
| `src/app/(authenticated)/perfil/page.tsx` | Página vira tabbed "Visão geral" | "Atividade" (D2, Especificação Visual) |
| `features/profile/components/` | Compõem as abas; aba "Atividade" renderiza `<ActivityTab>` com `useUserActivity(undefined, { enabled: activeTab === "atividade" })` |
| `features/admin/components/user-detail/user-detail-panel.tsx` | Passa a importar `ActivityTab`/hook de `features/activity/` (arquivos antigos removidos ou re-export) |

## Modelo de Dados

Nenhuma mudança. O feed reusa `UserActivityEvent` e `CheckIn` tal como persistidos — o merge, a taxonomia canônica de `type` (7 eventos + `CHECK_IN` sintético) e o shape `UserActivityListItem` (`{ id, type, description, occurredAt }`) são os já definidos na feature `historico-atividade-usuario`.

## Endpoint

`GET /users/me/activity` — retorna os últimos 20 itens combinados (`UserActivityEvent` + `CheckIn`) do usuário autenticado, no shape `UserActivityListItem`, ordenados por data decrescente. Sem paginação na v1. Resposta: `{ events: UserActivityListItem[] }`.

**Autorização (fork fechado):** `isProtected: true` — replicando o padrão declarativo dos demais `/users/me/*` (my-profile, my-metrics). O `userId` nunca vem do cliente; vem de `req.user.sub.id` injetado pelo guard JWT. A feature anterior enquadrou a visão do próprio usuário como "fora de escopo"; esta feature a entrega sem relaxar o endpoint admin (D1).

## Especificação Visual

**Artefato curado:** `specs/mockups/historico-atividade-perfil-visual.md`

**Fonte de design original:** nenhuma — layout definido via mockup do companion (opção B, aba "Atividade").

**Decisões visuais (norte, não pixel-final):**
- `/perfil` vira tabbed: "Visão geral" | "Atividade"; a tab row fica abaixo do header; o conteúdo de "Visão geral" é o grid 2-col atual (`ProfileCard` | `MetricCard`); o de "Atividade" é um card full-width com o feed.
- Feed idêntico à tela admin: agrupamento por data ("Hoje"/"Ontem"/data completa), ícone circular por categoria (accent para check-in, warning para segurança, surface-3 para conta/perfil/role/status), descrição + horário (subtle, menor).
- Tokens do tema real (VOLT, tema escuro) e componentes reais do projeto (Tabs shadcn, `PageContainer`, `Card`, `EmptyState`, `Skeleton`, `lucide-react`).

**Fidelidade:** o mockup é um norte. A fidelidade final (ícones reais, espaçamento fino) é construída na task de implementação do frontend.

## Riscos

| Risco | Impacto | Probabilidade | Score | Mitigação |
|---|---|---|---|---|
| Move de `ActivityTab`/hook para `features/activity/` quebra a tela admin (import paths) | 2 | 2 | 4 🟡 | Componente presentacional com props estáveis; testes existentes do `ActivityTab` e do `UserDetailTabs` continuam a validar a tela admin após o move; fallback seguro é re-export do admin |
| Colisão de cache React Query entre admin e perfil (mesma chave) | 1 | 1 | 2 🟢 | Query key `["user-activity", userId ?? "me"]` separa os dois planos |
| Precedência de rota `/users/me/activity` vs `/users/:userId/activity` | 1 | 1 | 2 🟢 | Fastify prioriza rota estática; padrão já em produção com `/users/me` |
| Endpoint novo expõe atividade de outro usuário por erro de `userId` | 3 | 1 | 3 🟡 | `userId` é 100% derivado de `req.user.sub.id` (nunca do body/params); teste de integração garante 401 sem token |

## Testes

- **`get-my-activity.controller.ts`:** teste de integração/e2e — 200 com `{ events }` para o usuário logado; 401 sem token. (DAO/use case já cobertos na feature `historico-atividade-usuario`.)
- **`use-user-activity.ts`:** teste do hook — `undefined` chama `/users/me/activity` com query key `["user-activity", "me"]`; com `userId` chama `/users/{userId}/activity`.
- **`activity-tab.tsx`:** testes existentes continuam passando após o move (agrupamento por data, ícone por `type`, loading distinto do vazio, erro distinto do vazio) — sem mudança de comportamento.
- **Página `/perfil`:** teste — abas "Visão geral"/"Atividade"; aba "Atividade" busca lazy (`enabled`) e renderiza `ActivityTab` com `events`; estados de loading/erro/vazio.
- **Aceitação:** usuário abre `/perfil`, clica em "Atividade" e vê o mesmo feed (mesmos detalhes/paginação) da tela admin de detalhes (evidência via QA gate, `super.user-story-verification`).