# Histórico de Atividade do Usuário - Independent Validation

**Date**: 2026-08-14
**Spec**: docs/superpowers/historico-atividade-usuario/specs/historico-atividade-usuario-design.md
**PRD**: docs/superpowers/historico-atividade-usuario/prd/prd-historico-atividade-usuario.md
**Diff range**: 5e0c8900..d205bd92
**Verifier**: INDEPENDENT
**Sensor depth**: 10 mutations across 4 logic files — user-activity-dao-memory.ts: 2/2 branches, prisma-user-activity-dao.ts: 2/3 branches, activity-tab.tsx: 4/8 branches, user-detail-format.ts: 2/3 branches

---

## Gate Check

- **Command**: `node_modules/.bin/vitest run --config ./test/vite.config.app-domain.ts` (backend unit) · `node_modules/.bin/vitest run --config ./test/vite.config.business-flow.ts` (business-flow) · `DATABASE_URL=postgresql://docker:docker@127.0.0.1:5432/test?schema=public node_modules/.bin/vitest run --config ./test/vite.config.integration.ts` (Prisma integration) · `node_modules/.bin/vitest run` (frontend)
- **Result**: backend unit 762 passed, 0 failed, 135 files - exit 0 · business-flow 204 passed, 0 failed, 49 files - exit 0 · integration 14 passed, 0 failed, 5 files - exit 0 · frontend 849 passed, 0 failed, 144 files - exit 0
- **Baseline**: reused from controller @ d205bd92 — conferido nesta rodada: `git rev-parse HEAD` = d205bd92 e `git status --porcelain` vazio exceto os diretórios untracked `docs/apresentacoes/`, `docs/superpowers/historico-atividade-usuario/qa/` e `.opencode/`
- **Typecheck/build**: executados nesta rodada (2026-08-14): `pnpm --filter backend tsc:check` exit 0 · `pnpm --filter frontend tsc:check` exit 0 · `pnpm --filter backend build` (tsup) exit 0 · `pnpm --filter frontend build` (Next.js) exit 0 — todos 100% verdes; `git status --porcelain` seguiu limpo após os builds

---

## Spec-Anchored Acceptance Criteria

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion expression | Result |
| --- | --- | --- | --- |
| FR-001 WHEN um admin consulta a aba Atividade THEN recebe os últimos 20 eventos ordenados por data/hora decrescente | lista limitada a 20, ordenação desc | `get-user-activity.usecase.ts:35` `const ACTIVITY_LIMIT = 20` + `:53` passado ao DAO; `user-activity-dao-memory.test.ts:28` `expect(result.map((item) => item.id)).toEqual(["neg5","neg3","neg1"])`; `user-activity-dao-memory.test.ts:44-46` `expect(result).toHaveLength(20)` + `expect(result[19].id).toBe("item-19")`; `prisma-user-activity-dao.integration-test.ts:101,134` `expect(result).toHaveLength(20)`; `get-user-activity.business-flow-test.ts:84` `expect(response.status).toBe(HTTP_STATUS.OK)` | ✅ PASS |
| FR-002 WHEN um evento é exibido THEN indica seu tipo e o horário em que ocorreu | shape `{id, type, description, occurredAt ISO}` + horário formatado no frontend | `get-user-activity.business-flow-test.ts:87-91` `expect(response.body.events).toEqual([{ id:"activity-1", type:"LOGIN", description:", occurredAt: occurredAt.toISOString() }])`; `activity-tab.test.tsx:174` `expect(screen.queryByText(occurredAt)).not.toBeInTheDocument()` + `:176-182` matriz com horário `Intl.DateTimeFormat(... {hour, minute})` | ✅ PASS |
| FR-003 WHEN eventos de datas diferentes são exibidos THEN são agrupados sob cabeçalhos "Hoje"/"Ontem"/data completa | labels fixados no texto "Hoje", "Ontem" e data completa pt-BR | `activity-tab.test.tsx:51` `expect(screen.getByText("Hoje")).toBeInTheDocument()`; `activity-tab.test.tsx:52-60` matriz com `Intl.DateTimeFormat("pt-BR",{day,month,year})` completo; `activity-tab.test.tsx:71` `expect(screen.getByText("Ontem")).toBeInTheDocument()` | ✅ PASS |
| FR-004 WHEN um evento é exibido THEN seu ícone assume cor distinta por categoria (check-in=accent, segurança=warning, conta/perfil/role/status=surface-3) | tokens accent/warning/surface-3 por categoria, no círculo (badge) e no ícone | `activity-tab.test.tsx:85-86` CHECK_IN `expect(badge).toHaveClass("bg-accent/16")` + `expect(badge.querySelector("svg")).toHaveClass("text-accent")`; `activity-tab.test.tsx:107-117` PASSWORD_CHANGED+ACCOUNT_LOCKED `classList.contains("bg-warning-soft")` + `svgClasses.every(cls.includes("text-warning"))`; `activity-tab.test.tsx:155-164` GOOGLE_LINKED/PROFILE_UPDATED/ROLE_CHANGED/STATUS_CHANGED/LOGIN `classList.contains("bg-surface-3")` + `svgClasses.every(cls.includes("text-muted-foreground"))` | ✅ PASS |
| FR-005 WHEN um login bem-sucedido (credenciais ou Google) ocorre THEN gera evento do tipo "login" | subscriber grava type `LOGIN` / descrição "Login realizado" | `record-user-activity.subscriber.test.ts:37-42` `expect(repository.records[0]).toMatchObject({ type:"LOGIN", description:"Login realizado" })`; `authenticate.usecase.test.ts:250-258` `expect(receivedEvent).not.toBeNull()` com payload userEmail/userName; `authenticate-with-google.usecase.test.ts:247-252` e `:301-311` publicam `LoginSucceededEvent`/`GoogleAccountLinkedEvent` com `userId` | ✅ PASS |
| FR-006 WHEN uma troca de senha bem-sucedida ocorre THEN gera evento do tipo "senha alterada" | subscriber grava type `PASSWORD_CHANGED` / "Senha alterada" | `record-user-activity.subscriber.test.ts:54-59` `expect(repository.records[0]).toMatchObject({ type:"PASSWORD_CHANGED", description:"Senha alterada" })` | ✅ PASS |
| FR-007 WHEN um vínculo Google bem-sucedido ocorre THEN gera evento do tipo "conta Google vinculada" | subscriber grava type `GOOGLE_LINKED` / "Conta Google vinculada" | `record-user-activity.subscriber.test.ts:71-76` `expect(repository.records[0]).toMatchObject({ type:"GOOGLE_LINKED", description:"Conta Google vinculada" })`; `authenticate-with-google.usecase.test.ts:301-309` payload com `userId: existingUser.id` | ✅ PASS |
| FR-008 WHEN um bloqueio de conta por segurança ocorre THEN gera evento do tipo "conta bloqueada" | subscriber grava type `ACCOUNT_LOCKED` / "Conta bloqueada por segurança" | `record-user-activity.subscriber.test.ts:89-94` `expect(repository.records[0]).toMatchObject({ type:"ACCOUNT_LOCKED", description:"Conta bloqueada por segurança" })` | ✅ PASS |
| FR-009 WHEN um perfil é atualizado com sucesso THEN gera evento do tipo "perfil atualizado" | subscriber grava type `PROFILE_UPDATED` / "Perfil atualizado" | `record-user-activity.subscriber.test.ts:106-111` `expect(repository.records[0]).toMatchObject({ type:"PROFILE_UPDATED", description:"Perfil atualizado" })`; `update-my-profile.usecase.test.ts:117-125` e `update-user-profile.usecase.test.ts:100-109` payload com `userId` | ✅ PASS |
| FR-010 WHEN uma role é promovida/rebaixada THEN gera evento do tipo "role alterada" | subscriber grava type `ROLE_CHANGED` / "Role alterada para **" + metadata | `record-user-activity.subscriber.test.ts:125-131` `expect(...).toMatchObject({ type:"ROLE_CHANGED", description:"Role alterada para Administrador", metadata:{previousRole,newRole} })`; `promote-to-admin.usecase.test.ts:279-287` e `demote-from-admin.usecase.test.ts:247-255` payload com roles corretas | ✅ PASS |
| FR-011 WHEN um status muda (individual ou em massa) THEN gera evento do tipo "status alterado" para cada usuário efetivamente afetado | subscriber grava type `STATUS_CHANGED` + metadata; bulk publica 1 evento por usuário `updated`, 0 para `skipped`/já-no-status-alvo | `record-user-activity.subscriber.test.ts:145-151` `expect(...).toMatchObject({ type:"STATUS_CHANGED", description:"Conta suspensa", metadata })`; `suspend-user.usecase.test.ts:153-161` e `active-user.usecase.test.ts:296-304`; `bulk-change-user-status.usecase.test.ts:197-206` `expect(receivedEvents).toHaveLength(1)` + payload `userId:"member-a-id"` com `member-b-id` (já suspenso) e `other-admin-id` (inelegível) ignorados | ✅ PASS |
| FR-012 WHEN um usuário realiza check-in THEN ele aparece no histórico mesclado com os demais eventos | item sintético `CHECK_IN` com `description = "Check-in — {gym.title}"` e `occurredAt = created_at` | `prisma-user-activity-dao.integration-test.ts:78-81` `expect(result[0].type).toBe("CHECK_IN")` + `expect(result[0].description).toBe("Check-in — Academia Central")` + `expect(result[1].type).toBe("LOGIN")` (merge ordenado para 2 ou mais itens) | ✅ PASS |
| FR-013 WHEN um usuário não tem nenhum evento THEN a aba exibe o estado vazio "Sem dados de atividade disponíveis" | texto exato do estado vazio preservado | `activity-tab.test.tsx:20-22` `expect(screen.getByText("Sem dados de atividade disponíveis")).toBeInTheDocument()` (também com `events` omitido em `:27-29`); `get-user-activity.usecase.test.ts:63` `expect(result.forceSuccess().value).toEqual({ events: [] })` | ✅ PASS |
| FR-014 WHEN o registrar de atividade falha THEN a ação de conta original não é impedida | `publish` resolve (não lança) mesmo com repositório rejeitando; erro logado com userId+type | `record-user-activity.subscriber.test.ts:165-179` `await expect(DomainEventPublisher.instance.publish(...)).resolves.toBeUndefined()` + `expect(failingRepository.record).toHaveBeenCalledTimes(1)` + `console.error` contendo `"userId=user-1 type=LOGIN"`; `record-user-activity.subscriber.ts:108-113` try/catch local | ✅ PASS |

**Coverage**: 14/14 criteria PASS · 0 gaps · 0 spec-precision gaps

---

## Discrimination Sensor

| # | File:line | Mutation | Killed? |
| --- | --- | --- | --- |
| 1 | `apps/backend/src/shared/infra/database/dao/in-memory/user-activity-dao-memory.ts:20` | sort desc → asc (`b.occurredAt - a.occurredAt` → `a - b`) | ✅ Killed |
| 2 | `apps/backend/src/shared/infra/database/dao/in-memory/user-activity-dao-memory.ts:21` | `.slice(0, limit)` → `.slice(0, limit + 5)` | ✅ Killed |
| 3 | `apps/backend/src/shared/infra/database/dao/prisma/prisma-user-activity-dao.ts:51` | `.slice(0, limit)` → `.slice(0, limit + 5)` | ✅ Killed |
| 4 | `apps/backend/src/shared/infra/database/dao/prisma/prisma-user-activity-dao.ts:45` | descrição do check-in `"Check-in — {gym.title}"` → `"Check-in — academia"` | ✅ Killed |
| 5 | `apps/frontend/src/features/admin/components/user-detail/activity-tab.tsx:60` | `"text-warning"` → `"text-accent"` (segurança perde a cor warning) | ✅ Killed |
| 6 | `apps/frontend/src/features/admin/components/user-detail/activity-tab.tsx:55` | `"bg-accent/16"` → `"bg-accent"` (badge do check-in muda de token) | ✅ Killed |
| 7 | `apps/frontend/src/features/admin/components/user-detail/activity-tab.tsx:54` | `"text-accent"` → `"text-warning"` (ícone do check-in muda de cor) | ✅ Killed |
| 8 | `apps/frontend/src/features/admin/components/user-detail/activity-tab.tsx:73` | `"bg-surface-3"` → `"bg-warning-soft"` (grupo conta/perfil muda de categoria) | ✅ Killed |
| 9 | `apps/frontend/src/features/admin/components/user-detail/user-detail-format.ts:43` | `return "Ontem"` → `return "Ontem!"` (M25 — regressão fixada em FIX-04) | ✅ Killed |
| 10 | `apps/frontend/src/features/admin/components/user-detail/user-detail-format.ts:42` | `yesterday.getDate() - 1` → `yesterday.getDate()` (evento de ontem passa a cair em data completa) | ✅ Killed |

**Depth**: P0-full (10 mutações dedicadas, todas executadas via snapshots hard-link isolados)
**Result**: 10/10 killed, 0 survived, 0 equivalent - **PASS ✅**

Post-sensor tree state: `git status --porcelain` vazio exceto os diretórios untracked já preexistentes, `git diff --stat` vazio; sensor reportou `summary.realTreeDirtied === false`.

---

## Verdict

**PASS ✅** - Todos os 14 critérios de aceitação (FR-001..FR-014) possuem asserção concreta em `file:line` contra o valor fixado na spec, incluindo as 3 categorias de cor de FR-004 (icon + badge) e o rótulo "Ontem" de FR-003 (M25); o sensor de discriminação matou 10/10 mutações (os 5 sobreviventes das rodadas 1-2 re-executados + 5 mutações frescas cobrindo as asserções novas), com árvore real intocada (`realTreeDirtied: false`).

**Lessons recorded**: none (clean PASS)