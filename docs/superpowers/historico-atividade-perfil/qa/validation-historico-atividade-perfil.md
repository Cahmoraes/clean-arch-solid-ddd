# Histórico de Atividade no Perfil - Independent Validation

**Date**: 2026-08-15
**Spec**: docs/superpowers/historico-atividade-perfil/specs/historico-atividade-perfil-design.md
**PRD**: docs/superpowers/historico-atividade-perfil/prd/prd-historico-atividade-perfil.md
**Diff range**: d9992c80..8e4cac32
**Verifier**: INDEPENDENT
**Sensor depth**: 8 mutations across 5 logic files — get-my-activity.controller.ts: 1/2 branches, use-user-activity.ts: 2/6 branches, activity-format.ts: 2/5 branches, activity-tab.tsx: 2/5 branches, page.tsx: 1/1 branch


---

## Gate Check

- **Command**: `cd apps/backend && npx vitest run --config ./test/vite.config.business-flow.ts src/user/infra/controller/get-my-activity.business-flow-test.ts` e `cd apps/frontend && npx vitest run src/features/activity 'src/app/(authenticated)/perfil'`
- **Result**: Backend business-flow: 2 passed, 0 failed, 0 skipped - exit 0. Frontend (features/activity + perfil): 33 passed, 0 failed, 0 skipped - exit 0.
- **Baseline**: ran — `git status --porcelain` não está vazio (modificações pré-existentes não relacionadas em `package.json`, `pnpm-lock.yaml`, `turbo.json` e nos arquivos de task em `docs/superpowers/.../plans/`), então a reutilização do Step 1 não se aplica; o subset da feature foi executado por mim em `8e4cac32`.
- **Typecheck/build**: Backend `tsc:check` FALHA apenas em `src/weather/infra/gateway/testing/in-memory-weather-gateway.test.ts` (TS2554: "Expected 0 arguments, but got 1." em linhas 10 e 25) — arquivo NÃO tocado neste diff (verificado: `git diff d9992c80..8e4cac32 --name-only` não contém nada de `weather/`), falha pré-existente de `main`. Frontend `tsc:check` limpo. `pnpm --filter backend build` OK (tsup ESM build success). `pnpm --filter frontend build` OK.

---

## Pre-Existing Failures

| Failing test | Baseline SHA | Evidence |
| --- | --- | --- |
| backend `tsc:check` — `src/weather/infra/gateway/testing/in-memory-weather-gateway.test.ts` (TS2554) | 8e4cac32 | Reproduzido por mim em `8e4cac32`; o arquivo não consta no diff da feature (`git diff d9992c80..8e4cac32 --name-only` sem qualquer arquivo `weather/`); últimos commits do arquivo são anteriores à feature |

---

## Spec-Anchored Acceptance Criteria

| Criterion | Spec-defined outcome | `file:line` + assertion expression | Result |
| --- | --- | --- | --- |
| FR-001 — Aba "Atividade" do `/perfil` exibe o histórico do usuário autenticado (e somente dele) | `GET /users/me/activity` retorna 200 com `{ events: UserActivityListItem[] }` para o próprio usuário; `userId` 100% de `req.user.sub.id`, sem canal de input do cliente | `apps/backend/src/user/infra/controller/get-my-activity.business-flow-test.ts:71` - `expect(response.status).toBe(HTTP_STATUS.OK)`; `:72` - `expect(response.body.events).toEqual([{ id:"activity-1", type:"LOGIN", ... }])`; `apps/backend/src/user/infra/controller/get-my-activity.controller.ts:37` - `isProtected: true`; `:45-47` - `const { sub: { id } } = req.user` → `execute({ userId: id })` (rota estática, sem `userId` do cliente; o teste 200 discrimina o id derivado via `userOfId` do use case); `apps/frontend/src/app/(authenticated)/perfil/page.test.tsx:235-236` - eventos renderizados após abrir a aba | ✅ PASS |
| FR-002 — Sem token válido, a requisição é rejeitada como não autorizada | 401 sem token | `apps/backend/src/user/infra/controller/get-my-activity.business-flow-test.ts:90` - `expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)` (requisição `GET /users/me/activity` sem header de Authorization) | ✅ PASS |
| FR-003 — Últimos 20 eventos, ordenados por data/hora decrescente | Read path compartilhado (DAO) devolve ≤20 itens em ordem desc; endpoint delega sem reordenar; feed do perfil exibe na ordem recebida | `apps/backend/src/shared/infra/database/dao/in-memory/user-activity-dao-memory.test.ts:28` - `expect(result.map((item) => item.id)).toEqual(["neg5","neg3","neg1"])` (ordem desc); `:44-46` - `expect(result).toHaveLength(20)` / `result[0].id === "item-0"` / `result[19].id === "item-19"` (limite 20); `apps/backend/src/user/application/use-case/get-user-activity.usecase.ts:35` - `const ACTIVITY_LIMIT = 20`; `:51-53` - limite passado ao DAO; `apps/backend/src/user/infra/controller/get-my-activity.controller.ts:47` - delega ao use case existente; frontend `page.test.tsx:235-236` - eventos exibidos (pass-through, sem reordenação no `ActivityTab`) | ✅ PASS |
| FR-004 — Mesmos 8 tipos de evento da tela admin | `LOGIN`, `PASSWORD_CHANGED`, `ACCOUNT_LOCKED`, `GOOGLE_LINKED`, `PROFILE_UPDATED`, `ROLE_CHANGED`, `STATUS_CHANGED`, `CHECK_IN` renderizados pelo mesmo `ActivityTab` compartilhado | `apps/frontend/src/features/activity/components/activity-tab.test.tsx:84-88` - CHECK_IN; `:105-117` - PASSWORD_CHANGED + ACCOUNT_LOCKED; `:150-164` - GOOGLE_LINKED + PROFILE_UPDATED + ROLE_CHANGED + STATUS_CHANGED + LOGIN (todos os 8 tipos do `UserActivityEventType`, `activity-tab.tsx:17-25`); `packages/api-types/index.d.ts:784` - enum com os 8 tipos no contrato | ✅ PASS |
| FR-005 — Cada evento indica tipo e horário | Horário formatado (pt-BR), não ISO cru; tipo expresso por ícone/descrição | `apps/frontend/src/features/activity/components/activity-tab.test.tsx:174` - `expect(screen.queryByText(occurredAt)).not.toBeInTheDocument()`; `:175-182` - `expect(screen.getByText(new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(occurredAt)))).toBeInTheDocument()`; tipo via `role="img"` com `aria-label` de categoria (`activity-tab.tsx:124-125`) | ✅ PASS |
| FR-006 — Sem paginação nem "carregar mais" | Apenas os 20 itens mais recentes, sem controles de paginação (mesma decisão da tela admin) | Limite 20 asserido em `apps/backend/src/shared/infra/database/dao/in-memory/user-activity-dao-memory.test.ts:44` - `expect(result).toHaveLength(20)`; ausência estrutural de paginação verificada por inspeção integral: `activity-tab.tsx:191-213` renderiza todos os grupos/eventos por `map` sem nenhum controle de paginação e `page.tsx:389-399` renderiza `ActivityTab` sem paginação; nenhuma asserção negativa dedicada (comportamento é garantia estrutural, não testada por assert) | ✅ PASS |
| FR-007 — Aba carrega dados apenas quando aberta (lazy) | `useUserActivity(undefined, { enabled: activeTab === "atividade" })`; sem fetch antes da abertura da aba | `apps/frontend/src/app/(authenticated)/perfil/page.test.tsx:189` - `expect(activityCalled).toBe(false)` (antes de clicar na aba); `:196-198` - `await waitFor(() => expect(activityCalled).toBe(true))` (após clicar); `apps/frontend/src/features/activity/api/use-user-activity.test.tsx:92-93` - `expect(result.current.isPending).toBe(true)` + `expect(result.current.fetchStatus).toBe("idle")` com `enabled: false`; `page.tsx:347` - `enabled: activeTab === "atividade"` | ✅ PASS |
| FR-008 — Agrupamento por data ("Hoje"/"Ontem"/data completa) | Mesmo agrupamento da tela admin | `apps/frontend/src/features/activity/components/activity-tab.test.tsx:51` - `expect(screen.getByText("Hoje")).toBeInTheDocument()`; `:52-60` - data completa via `Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" })`; `:71` - `expect(screen.getByText("Ontem")).toBeInTheDocument()` | ✅ PASS |
| FR-009 — Ícone com cor distinta por categoria | accent p/ check-in; warning p/ segurança; surface-3 p/ conta/perfil/administrativo | `apps/frontend/src/features/activity/components/activity-tab.test.tsx:85-86` - `expect(badge).toHaveClass("bg-accent/16")` + `expect(badge.querySelector("svg")).toHaveClass("text-accent")`; `:107-117` - `bg-warning-soft` + `text-warning` (segurança); `:154-164` - `bg-surface-3` + `text-muted-foreground` (conta/perfil/administrativo) | ✅ PASS |
| FR-010 — Loading exibe estado de carregamento | Skeleton distinto do vazio durante a busca | `apps/frontend/src/features/activity/components/activity-tab.test.tsx:187-190` - `expect(screen.getByTestId("activity-tab-skeleton")).toBeInTheDocument()` + vazio ausente; `apps/frontend/src/app/(authenticated)/perfil/page.test.tsx:301` - `expect(screen.getByTestId("activity-tab-skeleton")).toBeInTheDocument()` (na aba, com resposta atrasada 50ms) | ✅ PASS |
| FR-011 — Erro distinto do vazio | Mensagem de erro inline (`role="alert"`) sem o texto do EmptyState | `apps/frontend/src/features/activity/components/activity-tab.test.tsx:195-200` - `expect(screen.getByText("Não foi possível carregar o histórico de atividade.")).toBeInTheDocument()` + `queryByText("Sem dados de atividade disponíveis")` ausente; `apps/frontend/src/app/(authenticated)/perfil/page.test.tsx:276-281` - `expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível carregar o histórico de atividade.")` + vazio ausente (HTTP 500) | ✅ PASS |
| FR-012 — Vazio exibe EmptyState claro | `EmptyState` "Sem dados de atividade disponíveis" quando não há eventos | `apps/frontend/src/features/activity/components/activity-tab.test.tsx:20-22` - `expect(screen.getByText("Sem dados de atividade disponíveis")).toBeInTheDocument()`; `:27-29` - idem com `events` omitido; `apps/frontend/src/app/(authenticated)/perfil/page.test.tsx:255-257` - `expect(await screen.findByText("Sem dados de atividade disponíveis")).toBeInTheDocument()` (events `[]`) | ✅ PASS |

**Coverage**: 12/12 criteria PASS · 0 gaps · 0 spec-precision gaps

---

## Discrimination Sensor

| # | File:line | Mutation | Killed? |
| --- | --- | --- | --- |
| M1 | `apps/backend/src/user/infra/controller/get-my-activity.controller.ts:37` | `isProtected: true` → `isProtected: false` (rota pública — falha de autenticação não retorna 401) | ✅ Killed |
| M2 | `apps/frontend/src/features/activity/api/use-user-activity.ts:16` | `userId ?? "me"` → `userId ?? "other"` (query key errada para o plano "me") | ✅ Killed |
| M3 | `apps/frontend/src/features/activity/api/use-user-activity.ts:38` | `const { data, error } = userId` → `const { data, error } = undefined` (branch `undefined` sempre ativo; com `userId` chamaria `/users/me/activity` em vez de `/users/{userId}/activity`) | ✅ Killed |
| M4 | `apps/frontend/src/features/activity/components/activity-format.ts:13` | `return "Hoje"` → `return "Agora"` (rótulo de agrupamento do dia atual) | ✅ Killed |
| M5 | `apps/frontend/src/features/activity/components/activity-format.ts:17` | `return "Ontem"` → `return "Ayer"` (rótulo de agrupamento de ontem) | ✅ Killed |
| M6 | `apps/frontend/src/features/activity/components/activity-tab.tsx:176` | `if (isLoading) return <ActivityTabSkeleton />` → `if (isLoading) return null` (skeleton removido) | ✅ Killed |
| M7 | `apps/frontend/src/features/activity/components/activity-tab.tsx:179` | `if (events.length === 0) {` → `if (events.length !== 0) {` (EmptyState desaparece com lista vazia) | ✅ Killed |
| M8 | `apps/frontend/src/app/(authenticated)/perfil/page.tsx:347` | `enabled: activeTab === "atividade"` → `enabled: activeTab !== "atividade"` (fetch dispara antes de abrir a aba) | ✅ Killed |

**Depth**: P0-full (8 mutations across 5 logic files — guard de autenticação + branch de path do hook + formatação/estados do feed + lazy-load da página)
**Result**: 8/8 killed - PASS ✅

Post-sensor tree state: `summary.realTreeDirtied` = `false` (snapshots isolados; o tree real nunca foi mutado). `git status --porcelain` segue apenas com as modificações pré-existentes não relacionadas já registradas no Gate Check.

---

## Verdict

**PASS ✅** - Todos os 12 critérios de aceitação (FR-001 a FR-012) têm asserção localizada com o valor definido pela spec, e as 8 mutações do sensor de discriminação foram todas mortas pelos testes (incluindo o flip do guard `isProtected` do novo endpoint), comprovando que os testes detectam regressões no read path, no hook, no feed e no lazy-load da página. A única falha observada (`tsc:check` do backend em `in-memory-weather-gateway.test.ts`) é pré-existente e fora do diff desta feature.

**Lessons recorded**: none (clean PASS)