# Paginação da Atividade no Admin - Independent Validation

**Date**: 2026-08-29
**Spec**: docs/superpowers/paginacao-atividade-admin-usuarios/specs/paginacao-atividade-admin-usuarios-design.md
**PRD**: none
**Diff range**: 84b4df22..53e2c069
**Verifier**: INDEPENDENT
**Sensor depth**: 10 mutations across 5 logic files — apps/backend/src/user/infra/controller/get-user-activity.controller.ts: 3/4 branches, apps/frontend/src/features/activity/api/use-user-activity.ts: 1/1 branches, apps/frontend/src/features/admin/components/user-detail/user-detail-panel.tsx: 2/3 branches, admin/atividade/page.tsx: 1/2 branches, apps/frontend/src/features/activity/lib/activity-pagination.ts: 3/9 branches

---

## Gate Check

- **Command**: backend — `npx vitest run --config ./test/vite.config.business-flow.ts src/user/infra/controller/get-user-activity.business-flow-test.ts` e `npx vitest run --config ./test/vite.config.app-domain.ts` (dentro de `apps/backend`); frontend — `npx vitest run` (dentro de `apps/frontend`)
- **Result**: backend business-flow: 5 passed, 0 failed, exit 0. Backend unit suite: 767 passed, 0 failed, exit 0 (135 arquivos) — inalterado desde a rodada 1 (`git diff --stat 6b5abbc4..53e2c069 -- apps/backend` vazio, confirmado nesta rodada; zero arquivo de backend tocado pelo commit `53e2c069`). Frontend: 915 passed, 0 failed, exit 0 (151 arquivos) — 1 teste a mais que a rodada 1 (914), correspondendo exatamente ao novo teste de fronteira `total === 5` (FIX-01)
- **Baseline**: ran — re-executei a suíte completa de frontend nesta rodada (`npx vitest run` em `apps/frontend`) e obtive 151/151 arquivos, 915/915 testes, exit 0, idêntico ao baseline informado (`53e2c069`); backend não foi re-executado por não ter nenhum arquivo alterado desde a rodada 1 (`6b5abbc4`, onde já havia sido confirmado 767 unit + 5 business-flow, 0 falhas) — reaproveitado por diff-stat vazio, não por suposição
- **Typecheck/build**: backend inalterado (mesmo estado da rodada 1: 2 erros pré-existentes em `src/weather/infra/gateway/testing/in-memory-weather-gateway.test.ts:10` e `:25`, confirmados já presentes em `84b4df22`, módulo `weather` não tocado pela feature — fora de escopo). Frontend `npx tsc --noEmit -p .` re-executado nesta rodada — 0 erros

---

## Spec-Anchored Acceptance Criteria

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion expression | Result |
| --- | --- | --- | --- |
| AC-01 WHEN `GET /users/:userId/activity` sem `page` THEN retorna `pagination` calculada com `page:1` | `{ page: 1, pageSize: 20, total, totalPages }` | `apps/backend/src/user/infra/controller/get-user-activity.business-flow-test.ts:93` - `expect(response.body.pagination).toEqual({ page: 1, pageSize: 20, total: 1, totalPages: 1 })` | ✅ PASS |
| AC-02 WHEN `GET /users/:userId/activity?page=2` THEN repassa `page` ao use case e reflete em `pagination` | `pagination.page === 2` | `apps/backend/src/user/infra/controller/get-user-activity.business-flow-test.ts:126` - `expect(response.body.pagination).toEqual({ page: 2, pageSize: 20, total: 1, totalPages: 1 })` | ✅ PASS |
| AC-03 WHEN `?page=0` (ou inválido) THEN retorna 400 | status 400 | `apps/backend/src/user/infra/controller/get-user-activity.business-flow-test.ts:147` - `expect(response.status).toBe(400)` | ✅ PASS |
| AC-04 WHEN não-admin ou usuário inexistente THEN 403/404 (inalterado) | 403 / 404 | `apps/backend/src/user/infra/controller/get-user-activity.business-flow-test.ts:175` - `expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)`; `:185` - `expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)` | ✅ PASS |
| AC-05 `packages/api-types/index.d.ts` reflete `query.page` e `pagination` de `/users/{userId}/activity` | shape espelha `/users/me/activity` | `packages/api-types/index.d.ts:1414-1415` (`query?: { page?: number }`), `:1440-1448` (`pagination: { page, pageSize, total, totalPages }`), `:1453` (`400` schema) | ✅ PASS |
| AC-06 WHEN `userActivityQueryKey(userId, page)` variante admin THEN inclui `page` (chaves distintas por página) | `[..., "admin", userId, page]`, chaves 1≠2 | `apps/frontend/src/features/activity/api/use-user-activity.test.tsx:168-179` - `expect(userActivityQueryKey("user-1",1)).toEqual([...,1])` / `toEqual([...,2])`; `:180-182` - `expect(...).not.toEqual(...)` | ✅ PASS |
| AC-07 WHEN `useUserActivity(userId,{page})` THEN envia `?page=` a `/users/{userId}/activity` e expõe `data.pagination` | query string `page=2`, `data.pagination` completo | `apps/frontend/src/features/activity/api/use-user-activity.test.tsx:191` - `expect(new URL(request.url).searchParams.get("page")).toBe("2")`; `:213-218` - `expect(result.current.data?.pagination).toEqual({page:2,pageSize:20,total:21,totalPages:2})` | ✅ PASS |
| AC-08 Comportamento da variante `"me"` (perfil) permanece inalterado | sem regressão | Código de `fetchMyActivity`/`preserveMyActivityPlaceholder` não tocado pelo diff completo (`84b4df22..53e2c069`, incluindo o commit `53e2c069`, que só adiciona testes); suíte completa de `use-user-activity.test.tsx` e `perfil/page.test.tsx` continuam 100% verdes (ver Gate Check) | ✅ PASS |
| AC-09 WHEN drawer admin renderiza aba Atividade THEN exibe no máximo 5 eventos mesmo com mais retornados pela API | corte estrito em 5 | `apps/frontend/src/features/admin/components/user-detail/user-detail-panel.test.tsx:191-194` - `expect(screen.getByText("Evento 5")).toBeInTheDocument()`; `expect(screen.queryByText("Evento 6")).not.toBeInTheDocument()` | ✅ PASS |
| AC-10 WHEN `pagination.total > 5` THEN link "Ver histórico completo" aparece, apontando para `/admin/usuarios/{userId}/atividade` | visível quando `total=7`; ausente no limiar exato `total=5`; `href` exato | `apps/frontend/src/features/admin/components/user-detail/user-detail-panel.test.tsx:196-197` - `expect(link).toHaveAttribute("href","/admin/usuarios/u1/atividade")`; fronteira travada por `:230-256` (teste `"não exibe o link para o histórico completo quando o total é exatamente 5"`) - `expect(screen.queryByRole("link", { name: "Ver histórico completo" })).not.toBeInTheDocument()` com `pagination.total === 5` | ✅ PASS |
| AC-11 WHEN `pagination.total <= 5` THEN link não é exibido | ausente quando `total=1`; ausente no limiar exato `total=5` | `apps/frontend/src/features/admin/components/user-detail/user-detail-panel.test.tsx:225-227` - `expect(screen.queryByRole("link",{name:"Ver histórico completo"})).not.toBeInTheDocument()` (total=1); reforçado pelo mesmo novo teste `:230-256` (total=5, o ponto exato onde `>` e `>=` divergem) | ✅ PASS |
| AC-12 `ActivityTab` continua sem a prop `pagination` no drawer — nenhum footer de paginação aparece ali | `ActivityTab` sem `pagination` | `apps/frontend/src/features/admin/components/user-detail/user-detail-panel.tsx:120-124` - chamada `<ActivityTab events={activitySummaryEvents} isLoading={...} isError={...} />` sem prop `pagination`; footer condicionado a `pagination` truthy em `apps/frontend/src/features/activity/components/activity-tab.tsx:266` | ✅ PASS |
| AC-13 WHEN `/admin/usuarios/{userId}/atividade` monta THEN exibe nome do usuário no cabeçalho e a lista completa paginada (20/página) via `ActivityTab`+`NumberedPagination` | nome + eventos renderizados | `apps/frontend/src/app/(authenticated)/admin/usuarios/[userId]/atividade/page.test.tsx:90-91` - `expect(await screen.findByText(/maria souza/i)).toBeInTheDocument()`; `expect(await screen.findByText("Login realizado")).toBeInTheDocument()` | ✅ PASS |
| AC-14 WHEN usuário troca de página THEN URL é atualizada via `router.replace("?page=N")` (mesmo padrão do `/perfil`) | `router.replace` chamado com `?page=2` | `apps/frontend/src/app/(authenticated)/admin/usuarios/[userId]/atividade/page.test.tsx:97` (offset atual, após a asserção `aria-current` adicionada em `53e2c069`) - `expect(mockReplace).toHaveBeenCalledWith("?page=2")` | ✅ PASS |
| AC-15 Rota segue convenção `useParams` (não `params: Promise<...>`) já usada em outras rotas dinâmicas de `admin/` | `useParams<{userId}>()` | `apps/frontend/src/app/(authenticated)/admin/usuarios/[userId]/atividade/page.tsx:79-84` - `const params = useParams<{ userId: string }>()` (evidência de código; convenção estrutural, não é comportamento observável por teste) | ✅ PASS |

**Coverage**: 15/15 criteria PASS · 0 gaps (uncovered) · 0 spec-precision gaps

**Observação sobre AC-10/AC-11 (gap resolvido na rodada 2):** a rodada 1 havia marcado AC-10/AC-11 como gap de precisão de spec porque nenhum teste cobria o valor-limite `total=5` exatamente — o ponto onde `>` e `>=` divergem. O commit `53e2c069` adicionou o teste `"não exibe o link para o histórico completo quando o total é exatamente 5"` (`user-detail-panel.test.tsx:230-256`), que renderiza o drawer com `pagination.total === 5` e afirma que o link "Ver histórico completo" está ausente. Essa asserção pina exatamente o operador `>` (não `>=`) exigido pelo spec/Task 3 e foi confirmada empiricamente pelo sensor de mutação desta rodada (mutação #6, agora `✅ Killed`). Gap fechado — AC-10 e AC-11 passam a ✅ PASS.

---

## Discrimination Sensor

| # | File:line | Mutation | Killed? |
| --- | --- | --- | --- |
| 1 | `apps/backend/src/user/infra/controller/get-user-activity.controller.ts:25` | `.min(1)` → `.min(0)` (query schema aceita `page=0`) | ✅ Killed |
| 2 | `apps/backend/src/user/infra/controller/get-user-activity.controller.ts:86` | `parseQueryResult.value.page ?? 1` → `?? 2` (default de página) | ✅ Killed |
| 3 | `apps/backend/src/user/infra/controller/get-user-activity.controller.ts:94` | `body: result.value` → `body: { events: result.value.events }` (remove `pagination` da resposta) | ✅ Killed |
| 4 | `apps/frontend/src/features/activity/api/use-user-activity.ts:40` | `query: { page }` → `query: {}` (deixa de enviar `page` ao endpoint admin) | ✅ Killed |
| 5 | `apps/frontend/src/features/admin/components/user-detail/user-detail-panel.tsx:28` | `ACTIVITY_SUMMARY_LIMIT = 5` → `= 4` | ✅ Killed |
| 6 | `apps/frontend/src/features/admin/components/user-detail/user-detail-panel.tsx:99` | `(total ?? 0) > ACTIVITY_SUMMARY_LIMIT` → `>= ACTIVITY_SUMMARY_LIMIT` | ✅ Killed (re-verificado rodada 2) |
| 7 | `admin/atividade/page.tsx:31` (`apps/frontend/src/app/(authenticated)/admin/usuarios/[userId]/atividade/page.tsx:31`) | `nextParams.set("page", String(nextPage))` → `String(nextPage + 1)` | ✅ Killed |
| 8 | `apps/frontend/src/features/activity/lib/activity-pagination.ts:5` | `parsedPage > 0` → `parsedPage >= 0` (aceita `page=0` como válido na URL) | ✅ Killed |
| 9 | `apps/frontend/src/features/activity/lib/activity-pagination.ts:15` | `pagination.totalPages > 1` → `>= 1` (mostra paginação do topo com página única) | ✅ Killed (re-verificado rodada 2) |
| 10 | `apps/frontend/src/features/activity/lib/activity-pagination.ts:22` | `Math.min(...)` → `Math.max(...)` (quebra o clamp de página atual no topo) | ✅ Killed (re-verificado rodada 2) |

**Depth**: lightweight (10 mutações, teto de 10 para passe lightweight; cada arquivo de lógica nova atingiu seu mínimo proporcional — ver `**Sensor depth**` acima). `apps/frontend/src/features/activity/components/activity-pagination-card-header.tsx` (novo, extraído no commit de refactor final) recebeu 0 mutações dedicadas, justificado: seu único ramo (`showTopPagination ? <NumberedPagination/> : null`) delega inteiramente ao resultado de `shouldShowTopPagination`/`getTopActivityPage` (mutados em #9 e #10 de `activity-pagination.ts`), então uma mutação própria nesse wrapper não adicionaria discriminação além da já obtida mutando as funções que ele consome.
**Result**: 10/10 killed - **PASS ✅**

### Re-verificação das 3 mutações sobreviventes (rodada 2)

As mutações #6, #9 e #10 sobreviveram na rodada 1. O commit `53e2c069` (test-only, nenhum código de produção tocado) adicionou 3 asserções direcionadas. Re-injetei exatamente as mesmas 3 mutações, nas mesmas linhas (confirmadas inalteradas nesta rodada por leitura direta de `activity-pagination.ts` e `user-detail-panel.tsx`), via `run-mutation-batch.cjs` com isolamento `hardlink` (`summary.realTreeDirtied: false` em ambos os lotes rodados; `git status --porcelain` e `git diff --stat` sobre os arquivos da feature permaneceram vazios durante todo o processo):

- **#6** (`user-detail-panel.tsx:99`): subset `user-detail-panel.test.tsx` → **killed** (exit 1). O novo teste `total === 5` (`:230-256`) falha sob a mutação `>=`, porque com `>=` o link passaria a aparecer com `total===5`.
- **#9** (`activity-pagination.ts:15`): subset combinado (`perfil/page.test.tsx` + `atividade/page.test.tsx`) → **killed** (exit 1). Rodada de desambiguação, rodando cada arquivo isoladamente: `atividade/page.test.tsx` sozinho já mata a mutação (subset exit 1); `perfil/page.test.tsx` sozinho sobrevive no subset e só é morto ao escalar para a suíte completa (que inclui `atividade/page.test.tsx`) — confirma que quem trava esse operador é exclusivamente o novo teste em `page.test.tsx:50-53` da rota admin (`expect(screen.queryByTestId("admin-activity-top-pagination")).not.toBeInTheDocument()` no cenário `totalPages: 1`), não o `perfil/page.test.tsx`.
- **#10** (`activity-pagination.ts:22`): mesmo padrão de desambiguação de #9 — `atividade/page.test.tsx` sozinho mata a mutação no subset; `perfil/page.test.tsx` sozinho sobrevive no subset e só morre na suíte completa. A nova asserção `page.test.tsx:87-90` (`expect(screen.getByTestId("admin-activity-top-page-1")).toHaveAttribute("aria-current","page")` antes do clique, no cenário `page:1,totalPages:2`) é o que trava o clamp `Math.min`.

Nenhuma das 3 sobrevive mais. Nenhuma nova mutação foi introduzida nesta rodada — as outras 7 (já `✅ Killed` na rodada 1) não foram re-executadas por não terem nenhum arquivo de origem alterado desde então.

Post-sensor tree state: `git status --porcelain` reporta apenas `M apps/frontend/AGENTS.md` (pré-existente, não relacionado à feature) e o diretório não versionado `docs/superpowers/paginacao-atividade-admin-usuarios/qa/` (o próprio relatório desta verificação). `git diff --stat` sobre os arquivos de código-fonte da feature: vazio.

---

## Verdict

**PASS ✅** - Cobertura de critérios de aceite completa (15/15 PASS, 0 gaps, 0 gaps de precisão de spec — os 2 gaps de precisão da rodada 1 foram fechados pelo novo teste de fronteira `total===5`). O sensor de mutação re-executado desta rodada confirma, por execução real (não argumentação), que as 3 mutações antes sobreviventes (#6, #9, #10) agora são mortas pelas 3 asserções adicionadas no commit `53e2c069` — commit test-only, nenhum código de produção alterado. Backend permanece verde (nenhum arquivo tocado desde a rodada 1, diff-stat vazio confirmado). Frontend: 915/915 testes, 151/151 arquivos, exit 0, typecheck 0 erros — ambos re-executados nesta rodada. Árvore real nunca foi modificada pelo processo de mutação (`realTreeDirtied: false` em todos os lotes). Feature pronta para o gate de QA.

**Lessons recorded**: nenhuma lição nova (sinais já registrados na rodada 1 como L-026 e L-027; esta rodada apenas confirma a correção desses sinais, o que não é um sinal novo fundamentado)
