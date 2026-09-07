# Scroll Infinito no Dropdown de Notificações - Independent Validation

**Date**: 2026-09-07
**Spec**: docs/superpowers/notificacoes-scroll-infinito/specs/notificacoes-scroll-infinito-design.md
**PRD**: docs/superpowers/notificacoes-scroll-infinito/prd/prd-notificacoes-scroll-infinito.md
**Diff range**: e2000af4..6926a468
**Verifier**: INDEPENDENT
**Round**: 2/3
**Sensor depth**: 12 mutations across 6 logic files — in-memory-notification.repository.ts: 2/1 branches, prisma-notification.repository.ts: 1/1 branches, get-notifications.usecase.ts: 1/0 branches, get-notifications.controller.ts: 2/2 branches, use-notifications.ts: 4/8 branches, notification-dropdown.tsx: 2/4 branches

---

## Round History

| Round | HEAD | Verdict | Residual gaps (FIX/EQ ids) |
| --- | --- | --- | --- |
| 1 | 2e53c076 | FAIL ❌ | FIX-01, FIX-02, FIX-03, FIX-04, FIX-05, FIX-06, FIX-07, FIX-08 |
| 2 | 6926a468 | PASS ✅ | EQ-01 (M3 não executável — gap de ambiente pré-existente, fora do escopo do repositório) |

---

## Gate Check

- **Command**: `pnpm --filter backend test:run` / `pnpm --filter backend test:business-flow` / `pnpm --filter frontend test -- --run`
- **Result**: backend unit 769 passed, 0 failed, 0 skipped - exit 0 · backend business-flow 216 passed, 0 failed, 0 skipped - exit 0 · frontend 977 passed, 0 failed, 0 skipped - exit 0
- **Baseline**: ran (o baseline de checkpoint informado era do SHA 6926a468, que é o HEAD atual, mas `git status --porcelain` NÃO estava limpo — 7 modificações não commitadas pré-existentes a esta verificação, sendo uma delas um arquivo de teste real: `apps/frontend/src/features/weather/components/weather-globe.test.tsx`, além dos 6 arquivos de plano. Por isso o baseline não pôde ser reusado e as três suítes foram executadas por mim, reproduzindo exatamente 769/216/977, exit 0)
- **Typecheck/build**: `pnpm --filter frontend tsc:check` exit 0, sem nenhum erro. `pnpm --filter backend tsc:check` exit 1 com exatamente os mesmos 2 erros TS2554 já registrados na rodada 1, ambos em `apps/backend/src/weather/infra/gateway/testing/in-memory-weather-gateway.test.ts` (linhas 10 e 25) — arquivo fora do diff da feature (ver Pre-Existing Failures). Nenhum erro de tipo no bounded context `notification`, incluindo o novo `prisma-notification.repository.integration-test.ts`, o que confirma que os modelos/campos Prisma e a assinatura de `Notification.create` usados nele estão corretos. `pnpm --filter backend biome:fix` exit 0 — "Checked 652 files. No fixes applied."

---

## Pre-Existing Failures

| Failing test | Baseline SHA | Evidence |
| --- | --- | --- |
| `apps/backend/src/weather/infra/gateway/testing/in-memory-weather-gateway.test.ts(10,50)` e `(25,50)` — `error TS2554: Expected 0 arguments, but got 1` (falha de `tsc:check`, não da suíte de testes) | e2000af4 | `git diff --stat e2000af4..HEAD` não toca nenhum arquivo em `apps/backend/src/weather/`, e `git status --porcelain` não lista alteração local nesse diretório — logo o erro existe idêntico no BASE. Reproduzido de forma idêntica nas rodadas 1 e 2. As três suítes de teste passam 100%. |
| `apps/backend/src/**/*.integration-test.ts` — 5 dos 6 arquivos falham com `Authentication failed against the database server, the provided database credentials for 'test' are not valid` | e2000af4 | Executado por mim: `vitest run --config ./test/vite.config.integration.ts` → 5 failed, 1 passed (21 tests failed). Os 4 arquivos que já existiam antes da feature (`prisma-subscription-repository`, `prisma-user-activity-repository`, `prisma-stripe-webhook-event-repository`, `prisma-user-activity-dao`) falham exatamente do mesmo jeito. Causa confirmada independentemente: `apps/backend/.env.test` aponta para `postgresql://test:test@localhost:5432/test`, mas o container `postgresql-dev` só expõe `POSTGRESQL_DATABASE=apisolid` / `POSTGRES_USERNAME=docker` (`docker inspect postgresql-dev`), e `psql -U test -d test` responde `FATAL: password authentication failed for user "test"`. Gap de ambiente local pré-existente, não introduzido por esta feature. |

---

## Spec-Anchored Acceptance Criteria

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion expression | Result |
| --- | --- | --- | --- |
| FR-001 WHEN a sentinela entra na viewport com `hasNextPage && !isFetchingNextPage` THEN `fetchNextPage` é disparado | exatamente 1 chamada; nenhuma chamada quando `isFetchingNextPage` | `apps/frontend/src/components/notification/notification-dropdown.test.tsx:77` - `expect(fetchNextPage).toHaveBeenCalledTimes(1)`; `:96` - `expect(fetchNextPage).not.toHaveBeenCalled()` | ✅ PASS |
| FR-002 WHEN um lote posterior à carga inicial é buscado THEN traz no máximo 5 itens | `offset=<acumulado>&limit=5` | `apps/frontend/src/lib/notifications/use-notifications.test.tsx:609-610` - `expect(mockGet).toHaveBeenCalledWith("/api/v1/notifications", { params: { query: { page: 1, unreadOnly: false, offset: 10, limit: 5 } } })`; `:614` - `toHaveLength(15)` | ✅ PASS |
| FR-003 WHEN o dropdown faz a carga inicial THEN traz no máximo 10 itens | `offset=0&limit=10` | `apps/frontend/src/lib/notifications/use-notifications.test.tsx:587-588` - mesma asserção com `offset: 0, limit: 10`; `:592` - `expect(result.current.notifications).toHaveLength(10)` | ✅ PASS |
| FR-004 WHEN o acumulado atinge `total` THEN `hasNextPage` vira false e nenhuma busca nova ocorre | `hasNextPage === false`; contagem de chamadas inalterada | `apps/frontend/src/lib/notifications/use-notifications.test.tsx:628` - `expect(result.current.hasNextPage).toBe(false)`; `:636` - `expect(listCallsAfter).toBe(listCallsBefore)` | ✅ PASS |
| FR-005 WHEN o total é ≤ 10 THEN a lista completa aparece sem nenhuma busca adicional | 7 itens, `hasNextPage === false` | `apps/frontend/src/lib/notifications/use-notifications.test.tsx:644-645` - `expect(result.current.notifications).toHaveLength(7)` + `expect(result.current.hasNextPage).toBe(false)` | ✅ PASS |
| FR-006 WHEN chega notificação via SSE com dropdown aberto THEN ela aparece imediatamente no topo | `notifications[0].id` é o id recebido | `apps/frontend/src/lib/notifications/use-notifications.test.tsx:393` - `expect(result.current.notifications[0]?.id).toBe("notification-streamed-1")` | ✅ PASS |
| FR-007 WHEN chega notificação via SSE THEN nenhum lote já carregado é re-buscado ou descartado | zero novas chamadas à lista; página 2 intacta | `apps/frontend/src/lib/notifications/use-notifications.test.tsx:399` - `expect(listCallsAfter).toBe(listCallsBefore)`; `:428` - `expect(result.current.notifications).toHaveLength(16)` após 15 itens já paginados | ✅ PASS |
| FR-008 WHEN o próximo lote está sendo buscado THEN um indicador discreto aparece no rodapé | elemento `role="status"` com texto "Carregando mais..." | `apps/frontend/src/components/notification/notification-dropdown.test.tsx:112` - `expect(status).toHaveTextContent("Carregando mais...")` | ✅ PASS |
| FR-009 WHEN o lote termina de carregar OU não há mais notificações THEN o indicador desaparece | spinner ausente nos dois ramos | `apps/frontend/src/components/notification/notification-dropdown.test.tsx:128` - `expect(screen.queryByRole("status")).not.toBeInTheDocument()` com `hasNextPage=false`; `:143` - mesma asserção com `hasNextPage=true, isFetchingNextPage=false` (ramo "lote terminou", adicionado por FIX-07) | ✅ PASS |
| FR-010 WHEN a busca de um lote falha THEN o sistema tenta novamente sozinho, sem UI de erro | `retry: 3`, `retryDelay: 0`; ≥3 tentativas; nenhum estado de erro exposto | `apps/frontend/src/lib/notifications/use-notifications.test.tsx:672-673` - `expect(result.current.notifications).toHaveLength(15)` + `expect(secondPageAttempts).toBeGreaterThanOrEqual(3)`; a ausência de UI de erro é garantida por contrato de tipo em `apps/frontend/src/lib/notifications/use-notifications.ts:40-50` - `UseNotificationsResult` não expõe nenhum campo `error`/`isError`, logo nenhum erro chega ao componente | ✅ PASS |
| FR-011 WHEN a busca de um lote falha THEN as notificações já exibidas permanecem inalteradas | lista idêntica à primeira página, 10 itens | `apps/frontend/src/lib/notifications/use-notifications.test.tsx:697-698` - `expect(result.current.notifications).toEqual(firstPageNotifications)` + `toHaveLength(10)` | ✅ PASS |
| FR-012 WHEN `offset`/`limit` são enviados THEN o repositório usa `skip=offset, take=limit`, ignorando `page` | `skip=10, take=5` (task-01, critério 1) | `apps/backend/src/notification/application/use-case/get-notifications.usecase.test.ts:79` - `expect(result.value.items).toHaveLength(5)` e `:81-83` - `expect(result.value.items.map((n) => n.id)).toEqual(saved.slice(10, 15).map((n) => n.id))`, agora ancorando a JANELA e não só a quantidade (FIX-01); mutante M1 (`skip → 0`) morre | ✅ PASS |
| FR-013 WHEN `offset`/`limit` estão ausentes THEN a paginação por `page` mantém `skip=(page-1)*ITEMS_PER_PAGE, take=ITEMS_PER_PAGE` | página 2 de 25 itens com `ITEMS_PER_PAGE=20` → 5 itens | `apps/backend/src/notification/application/use-case/get-notifications.usecase.test.ts:94-95` - `expect(result.value.items).toHaveLength(5)` + `expect(result.value.total).toBe(25)`; mutante M2 (`(page-1)*N → page*N`) morre | ✅ PASS |
| AC-01 (task-01) WHEN `GET /api/v1/notifications?offset=0&limit=51` THEN retorna 400 | HTTP 400 pela validação Zod (`limit` teto 50) | `apps/backend/src/notification/infra/controller/get-notifications.controller.business-flow-test.ts:117` - `expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)` com `.query({ offset: 0, limit: 51 })`; fronteira válida ancorada em `:144` - `expect(response.status).toBe(HTTP_STATUS.OK)` com `limit: 50` (FIX-02); mutante M4 (`.max(50) → .max(5000)`) morre | ✅ PASS |
| AC-02 (D0) WHEN `offset` é negativo ou `limit` é não-positivo THEN o schema Zod rejeita com 400 | HTTP 400 (`offset` inteiro `>= 0`, `limit` inteiro `>= 1`) | `apps/backend/src/notification/infra/controller/get-notifications.controller.business-flow-test.ts:135` - `expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)` com `offset: -1`; `:126` - mesma asserção com `limit: 0`; mutante M4B (remoção do `.min(0)` de `offset`) morre | ✅ PASS |
| AC-03 (task-01) WHEN `@repo/api-types` é regenerado THEN `offset`/`limit` aparecem como query params opcionais | `offset?: number`, `limit?: number` em `paths["/api/v1/notifications"]["get"]` | `packages/api-types/index.d.ts:4067` - `offset?: number;` e `:4069` - `limit?: number;` no bloco `query`, consumidos por `use-notifications.ts` com `pnpm --filter frontend tsc:check` exit 0 | ✅ PASS |
| AC-04 (D0 / Estrutura de Componentes) WHEN `PrismaNotificationRepository` recebe `offset`/`limit` THEN calcula `skip`/`take` a partir deles | `skip=offset, take=limit` | `apps/backend/src/notification/infra/repository/prisma/prisma-notification.repository.integration-test.ts:165-174` - `expect(result.total).toBe(15)`, `expect(result.items).toHaveLength(5)` e `expect(result.items.map((n) => n.id)).toEqual(saved.slice().reverse().slice(10, 15).map((n) => n.id))`, coerente com o `orderBy: { createdAt: "desc" }` de `prisma-notification.repository.ts:114`; retrocompatibilidade por `page` ancorada em `:196-204`. Asserção presente, tipada (backend `tsc` não acusa erro no arquivo) e revisada linha a linha; NÃO executável neste ambiente por gap de credenciais pré-existente (ver Pre-Existing Failures e EQ-01) | ✅ PASS (com risco residual documentado em EQ-01) |
| AC-05 (D2) WHEN chega via SSE uma notificação cujo `id` já existe em alguma página THEN o evento é ignorado | nenhuma duplicata inserida | `apps/frontend/src/lib/notifications/use-notifications.test.tsx:493` - `expect(result.current.notifications).toHaveLength(10)` após SSE com `notification-5` (id já vindo da API); `:524` e `:526-528` - `toHaveLength(11)` + `filter((n) => n.id === "notification-streamed-dup")).toHaveLength(1)` após o mesmo id SSE duas vezes (FIX-04); mutante M7 (dedup desligada) morre | ✅ PASS |
| AC-06 (D2) WHEN um item é prependado via SSE THEN o `offset` do próximo `fetchNextPage` usa `fetchedCount`, não `notifications.length` | próximo `offset` reflete só o que veio da API | `apps/frontend/src/lib/notifications/use-notifications.test.tsx:567` - `expect(mockGet).toHaveBeenCalledWith(..., { offset: 15, limit: 5 })` depois de 15 itens buscados + 1 prependado via SSE já confirmado no cache (`:556` asserta `toHaveLength(16)` antes do fetch); `:572` - `toHaveLength(21)` (FIX-05); mutante M6 (`fetchedCount → notifications.length`, que produziria `offset: 16`) morre | ✅ PASS |
| AC-07 (D2 / tabela de Riscos) WHEN chega SSE durante um `fetchNextPage` em andamento THEN não duplica nem corrompe a página em anexação | 10 + 1 + 5 = 16 itens; topo = item do SSE; requisição com `offset=10` | `apps/frontend/src/lib/notifications/use-notifications.test.tsx:456` - `toHaveLength(16)`; `:458` - topo é `"notification-streamed-race"`; `:465-466` - `offset: 10, limit: 5` | ✅ PASS |
| AC-08 (D2) WHEN chega notificação via SSE THEN o contador de não lidas continua sendo invalidado | novas chamadas a `/unread-count` | `apps/frontend/src/lib/notifications/use-notifications.test.tsx:365` - `expect(unreadCountCallsAfter).toBeGreaterThan(unreadCountCallsBefore)` | ✅ PASS |
| AC-09 (D3 Observabilidade) WHEN as tentativas de retry se esgotam THEN o erro é registrado via `logger.error`, sem UI | `logger.error` chamado; nenhuma UI adicional | `apps/frontend/src/lib/notifications/use-notifications.test.tsx:715` - `expect(loggerErrorSpy).toHaveBeenCalled()` (spy em `logger.error` de `lib/observability`); a cláusula "sem nenhuma UI adicional" é estruturalmente garantida por `apps/frontend/src/lib/notifications/use-notifications.ts:40-50`, onde `UseNotificationsResult` não expõe `error`/`isError` a nenhum componente | ✅ PASS |
| AC-10 (D1 Ciclo de vida) WHEN o dropdown desmonta THEN o `IntersectionObserver` é desconectado (`disconnect`) | `disconnect()` chamado no cleanup | `apps/frontend/src/components/notification/notification-dropdown.test.tsx:176` - `expect(observerInstances[0]?.disconnect).toHaveBeenCalled()` após `unmount()` (FIX-06); mutante M9 (cleanup vazio) morre | ✅ PASS |
| AC-11 (D1 Acessibilidade mínima) WHEN a sentinela é renderizada THEN ela é `aria-hidden="true"` | `aria-hidden="true"` | `apps/frontend/src/components/notification/notification-dropdown.test.tsx:160` - `expect(sentinel).toHaveAttribute("aria-hidden", "true")`, onde `sentinel` é lido de `observer.observe.mock.calls[0][0]` — ou seja, asserta o atributo no elemento efetivamente observado, não em um nó qualquer (FIX-07); implementação em `notification-dropdown.tsx:111` | ✅ PASS |
| AC-12 (D1 Acessibilidade mínima) WHEN o spinner de rodapé é renderizado THEN usa `role="status"` e `aria-live="polite"` | ambos os atributos | `apps/frontend/src/components/notification/notification-dropdown.test.tsx:112` - `screen.getByRole("status")` cobre `role="status"`; `:113` - `expect(status).toHaveAttribute("aria-live", "polite")` (FIX-07); implementação em `notification-dropdown.tsx:103-104` | ✅ PASS |
| AC-14 (D2 / Estrutura) WHEN `markAsRead`/`markAllAsRead` atualizam o cache THEN operam sobre `InfiniteData<NotificationsPage>` sem regressão | `readAt` aplicado no item correto em qualquer página, e revertido no `onError` | `apps/frontend/src/lib/notifications/use-notifications.test.tsx:305` - `expect(target?.readAt).toBe("2024-01-03T10:00:00Z")` para `notification-13`, que pertence à SEGUNDA página; `:308` - `expect(others.every((n) => n.readAt === null)).toBe(true)`; rollback em `:327` - `expect(target?.readAt).toBeNull()` após PATCH rejeitado (FIX-08); mutante M11 (`data.pages.map` restrito à primeira página) morre | ✅ PASS |

**Coverage**: 26/26 criteria PASS · 0 gaps · 0 spec-precision gaps

---

## Observações (itens sem valor pinado pelo spec)

Aplicando a lição L-037 registrada na rodada 1 ("só entram na tabela critérios que o spec pina"), o antigo item AC-13 foi retirado da tabela de critérios e registrado aqui, porque o spec não define nenhum valor observável para ele:

- **Contêiner rolável do dropdown** (Estrutura de Componentes: "Renderizar a lista com contêiner rolável"). O spec não pina altura, mecanismo nem classe. Implementado em `apps/frontend/src/components/notification/notification-dropdown.tsx:149` - `className="max-h-[400px] overflow-y-auto"`. **Risco residual real**: nenhum teste asserta esse contêiner, então remover `overflow-y-auto` não quebra nenhuma suíte, e em navegador a sentinela deixaria de entrar em viewport — o scroll infinito pararia de funcionar silenciosamente. Como o spec não pina o valor, isso não bloqueia o gate, mas fica registrado como candidato a asserção numa revisão futura do spec.

---

## Discrimination Sensor

| # | File:line | Mutation | Killed? |
| --- | --- | --- | --- |
| M1 | `apps/backend/src/notification/infra/repository/in-memory/in-memory-notification.repository.ts:54` | `return { skip: input.offset, ... }` → `return { skip: 0, ... }` | ✅ Killed (subset, exit 1) |
| M2 | `apps/backend/src/notification/infra/repository/in-memory/in-memory-notification.repository.ts:57` | `skip: (input.page - 1) * env.ITEMS_PER_PAGE` → `skip: input.page * env.ITEMS_PER_PAGE` | ✅ Killed (subset, exit 1) |
| M3 | `apps/backend/src/notification/infra/repository/prisma/prisma-notification.repository.ts:130` | `return { skip: input.offset, ... }` → `return { skip: 0, ... }` | ⏸️ Não executado — aceito como equivalent-by-environment (ver EQ-01) |
| M4 | `apps/backend/src/notification/infra/controller/get-notifications.controller.ts:28` | `limit: ...max(50)` → `limit: ...max(5000)` | ✅ Killed (subset, exit 1) |
| M4B | `apps/backend/src/notification/infra/controller/get-notifications.controller.ts:23` | `offset: z.coerce.number().int().min(0)` → `offset: z.coerce.number().int()` | ✅ Killed (subset, exit 1) |
| M5 | `apps/frontend/src/lib/notifications/use-notifications.ts:301` | `if (loaded >= lastPage.total)` → `if (loaded > lastPage.total)` | ✅ Killed (subset, exit 1) |
| M6 | `apps/frontend/src/lib/notifications/use-notifications.ts:300` | `sum + page.fetchedCount` → `sum + page.notifications.length` | ✅ Killed (subset, exit 1) |
| M7 | `apps/frontend/src/lib/notifications/use-notifications.ts:264` | `if (pagesContainNotification(previous.pages, payload.notificationId))` → `if (0 > 1)` (dedup por id desligado) | ✅ Killed (subset, exit 1) |
| M8 | `apps/frontend/src/components/notification/notification-dropdown.tsx:25` | `return hasNextPage && !isFetchingNextPage` → `return hasNextPage` | ✅ Killed (subset, exit 1) |
| M9 | `apps/frontend/src/components/notification/notification-dropdown.tsx:42` | `return () => observer.disconnect()` → `return () => undefined` | ✅ Killed (subset, exit 1) |
| M10 | `apps/backend/src/notification/application/use-case/get-notifications.usecase.ts:35` | `offset: input.offset` → `offset: undefined` | ✅ Killed (subset, exit 1) |
| M11 | `apps/frontend/src/lib/notifications/use-notifications.ts:153` | `pages: data.pages.map((page) => ({` → `pages: data.pages.slice(0, 1).map((page) => ({` (atualização otimista só na 1ª página) | ✅ Killed (subset, exit 1) |

**Depth**: lightweight (1–3)
**Result**: 11/12 killed, 0 bare survivors, 1 equivalent-by-environment (M3) - PASS ✅

**Validação do próprio sensor (harness control):** a mesma armadilha da rodada 1 foi neutralizada e re-provada. Três mutantes de controle no-op (inserção de comentário, um por suíte) foram injetados junto das mutações reais: `CONTROL-BE` (`in-memory-notification.repository.ts:54`), `CONTROL-BF` (`get-notifications.controller.ts:28`) e `CONTROL-FE` (`use-notifications.ts:301`). Os três foram reportados como **survived** após escalar para a suíte completa (`decidedBy: "full"`, exit 0), provando que os kills vêm dos testes e não de erro de ambiente do snapshot. Todos os comandos de teste foram prefixados com `PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false` para evitar o `ERR_PNPM_UNSAFE_MODULES_DIR` documentado na rodada 1. As três execuções do runner reportaram `summary.realTreeDirtied: false`.

Post-sensor tree state: `git status --porcelain` lista exatamente as mesmas 7 modificações pré-existentes ao início desta verificação (`weather-globe.test.tsx` e os 6 arquivos de plano) — idênticas antes e depois do sensor; nenhum arquivo de origem ou de teste da feature foi tocado.

---

## Equivalent Mutants

### EQ-01 - `apps/backend/src/notification/infra/repository/prisma/prisma-notification.repository.ts:130`

- **Invariant**: nenhuma suíte executável neste ambiente pode observar este mutante. A única suíte que exercita `PrismaNotificationRepository.resolvePagination` é `test:e2e:prisma` (`vite.config.integration.ts`, include `**/*.integration-test.ts`), e ela não consegue abrir conexão: `apps/backend/.env.test` aponta para `postgresql://test:test@localhost:5432/test`, mas o container `postgresql-dev` (bitnami/postgresql) provisiona apenas `POSTGRESQL_DATABASE=apisolid` com `POSTGRES_USERNAME=docker`. Trata-se de um gap de infraestrutura local pré-existente e fora do escopo do repositório: ele derruba igualmente os 4 arquivos `*.integration-test.ts` que já existiam antes desta feature. Não é uma equivalência semântica do mutante — é uma impossibilidade de execução, e por isso o risco residual está declarado explicitamente abaixo.
- **Attempted**: sim. Executei `PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false pnpm --filter backend exec vitest run --config ./test/vite.config.integration.ts` no HEAD **não mutado**: resultado `Test Files 5 failed | 1 passed (6)`, `Tests 21 failed | 1 passed (22)`, todos os erros sendo `PrismaClientKnownRequestError: Authentication failed against the database server, the provided database credentials for 'test' are not valid`. Confirmei a causa fora do vitest: `docker inspect postgresql-dev` mostra `POSTGRESQL_DATABASE=apisolid`/`POSTGRES_USERNAME=docker`, e `psql -U test -d test` responde `FATAL: password authentication failed for user "test"`. Como a suíte já é vermelha sem mutação, injetar o mutante não produziria leitura de sensor alguma (todo mutante apareceria como "killed" pelo erro de ambiente — exatamente o falso positivo que a rodada 1 documentou).
- **Revisão de código no lugar da execução** (o teste novo foi lido linha a linha, não aceito de boa-fé): `prisma-notification.repository.integration-test.ts` (a) usa `Notification.create({ id, userId, type, title, message })`, compatível com `CreateNotificationProps` (`notification.ts:23-31`, `id` opcional); (b) grava via `sut.save()`, cujo `toCreateInput` cria também a linha `userNotifications` com `deletedAt: null`, satisfazendo o `buildWhere` do próprio repositório; (c) normaliza `createdAt` por `prismaClient.notification.update` com timestamps espaçados de 1s, eliminando empate de ordenação; (d) a expectativa `saved.slice().reverse().slice(10, 15)` casa exatamente com `orderBy: { createdAt: "desc" }` + `skip: 10, take: 5` — com o mutante `skip: 0` o resultado seriam os 5 mais NOVOS, um conjunto disjunto do esperado, logo a asserção falharia; (e) o `afterEach` apaga `userNotification` → `notification` → `user` nessa ordem, respeitando o `onDelete: Restrict` de `Notification.user`; (f) todos os campos usados existem no `schema.prisma` (`Notification.userId`, `Notification.createdAt`, `UserNotification.userId`, `User.password_hash/role/status`) e `pnpm --filter backend tsc:check` não reporta nenhum erro nesse arquivo; (g) `globals: true` em `vite.config.shared.ts` habilita `describe/it/beforeEach/afterEach/afterAll` sem import. O arquivo casa com o include `**/*.integration-test.ts`, então passa a rodar automaticamente assim que a role/DB `test` existir.
- **Risco residual**: enquanto o ambiente de integração não for provisionado, a linha `skip: input.offset` do repositório de PRODUÇÃO permanece sem sensor executado — a garantia atual é revisão de código + tipagem + paridade com o repositório in-memory (cujo mutante equivalente M1 morre). Ação recomendada fora desta feature: criar a role/banco `test` no container ou alinhar `.env.test` às credenciais existentes, o que reativa 6 arquivos de teste de integração de uma vez.

---

## Gaps → Fix Tasks

Nenhum. As 8 tarefas de correção abertas na rodada 1 foram verificadas de forma independente e todas fecham o gap que motivaram:

| Fix (rodada 1) | Evidência de fechamento (rodada 2) | Mutante que agora morre |
| --- | --- | --- |
| FIX-01 - asserção do `skip` na paginação por `offset` | `get-notifications.usecase.test.ts:81-83` | M1 |
| FIX-02 - validação de contrato do controller | `get-notifications.controller.business-flow-test.ts:117, :126, :135, :144` | M4, M4B |
| FIX-03 - cobertura do `PrismaNotificationRepository` | `prisma-notification.repository.integration-test.ts:144-205` (escrito, tipado e revisado; não executável — EQ-01) | M3 (não executado) |
| FIX-04 - deduplicação por id na reconciliação SSE | `use-notifications.test.tsx:472-530` | M7 |
| FIX-05 - discriminar `fetchedCount` de `notifications.length` | `use-notifications.test.tsx:532-572` | M6 |
| FIX-06 - `disconnect()` do observer no unmount | `notification-dropdown.test.tsx:163-176` | M9 |
| FIX-07 - acessibilidade mínima + ramo faltante de FR-009 | `notification-dropdown.test.tsx:113, :143, :160` | (asserções diretas de atributo) |
| FIX-08 - atualização otimista sobre `InfiniteData` | `use-notifications.test.tsx:270-328` | M11 |

---

## Verdict

**PASS ✅** - As três suítes estão verdes e foram re-executadas por mim (backend 769, business-flow 216, frontend 977, exit 0 em todas), e os 26 critérios ancorados no spec/PRD têm agora asserção real em `file:line` contra o valor definido pelo spec. O sensor de discriminação subiu de 4/10 (rodada 1) para 11/12 mutantes mortos, com três mutantes de controle no-op corretamente sobrevivendo — prova de que os kills vêm dos testes e não do ambiente do snapshot. Os seis sobreviventes da rodada 1 (M1, M3, M4, M6, M7, M9/M10) foram re-executados contra o código de teste novo: todos morrem, exceto M3, que não é executável neste ambiente por um gap de credenciais de Postgres pré-existente — verificado independentemente por mim e confirmado como anterior à feature, já que derruba igualmente os 4 arquivos `*.integration-test.ts` que existiam antes dela. O teste de integração novo foi lido linha a linha e é discriminante caso a base de dados exista; o risco residual está declarado em EQ-01, junto com a ação de infraestrutura que o encerra. Nenhuma tarefa de correção nova é aberta nesta rodada.

**Lessons recorded**: L-046, L-047 (rodada 2). Reaproveitadas sem duplicar: L-030, L-032, L-037, L-040 a L-045 (rodada 1).
