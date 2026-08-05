# Bulk user status actions - Independent Validation

**Date**: 2026-08-05
**Spec**: docs/superpowers/bulk-user-status-actions/specs/bulk-user-status-actions-design.md
**PRD**: docs/superpowers/bulk-user-status-actions/prd/prd-bulk-user-status-actions.md
**Diff range**: f2c6cca56332e1758c1e9ef86c39de9889560477..433bf06381d7d803edcb95e1e241e58d8b30661e
**Verifier**: INDEPENDENT
**Sensor depth**: 11 mutations across 7 logic files - bulk-change-user-status.usecase.ts: 3/4 branches, in-memory-user-repository.ts: 1/2 branches, bulk-activate-users.controller.ts: 1/2 branches, page.tsx: 2/6 branches, use-bulk-change-user-status.ts: 1/2 branches, bulk-status-confirmation-dialog.tsx: 1/3 branches, user-row.tsx: 2/5 branches

---

## Gate Check

- **Command**: `pnpm --filter backend test:run` / `pnpm --filter backend test:business-flow` / `pnpm --filter frontend test -- --run`
- **Result**:
  - Backend unit: 715 passed, 0 failed, 0 skipped - exit 0
  - Backend business-flow: primeira execução apresentou 1 timeout flaky em `change-password.business-flow-test.ts`; rerun do teste isolado e rerun completo da suíte: 196 passed, 0 failed, 0 skipped - exit 0
  - Frontend: 781 passed, 0 failed, 0 skipped - exit 0
- **Baseline**: ran @ 433bf06381d7d803edcb95e1e241e58d8b30661e (a árvore tinha modificações prévias em `apps/backend/AGENTS.md` e `apps/frontend/AGENTS.md`, então a baseline não foi reaproveitada)
- **Typecheck/build**: backend `tsc:check` pass, frontend `tsc:check` pass, backend `build` pass, frontend `build` pass

---

## Spec-Anchored Acceptance Criteria

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion expression | Result |
| --- | --- | --- | --- |
| FR-001 — WHEN o admin marca checkboxes por linha THEN a seleção múltipla é refletida na página atual | checkboxes individuais acionam `onToggleSelect` e a página reflete a seleção parcial | `apps/frontend/src/features/admin/components/user-row.test.tsx:150` - `expect(onToggleSelect).toHaveBeenCalledWith(adminUser, true)`; `apps/frontend/src/app/(authenticated)/admin/usuarios/admin-users-page.test.tsx:360` - `expect(screen.getByTestId("admin-users-select-page")).toHaveAttribute("aria-checked", "mixed")` | ✅ PASS |
| FR-002 — WHEN apenas parte dos usuários elegíveis da página está selecionada THEN o checkbox de página fica indeterminado | estado `"mixed"` no checkbox de página | `apps/frontend/src/app/(authenticated)/admin/usuarios/admin-users-page.test.tsx:360` - `expect(screen.getByTestId("admin-users-select-page")).toHaveAttribute("aria-checked", "mixed")` | ✅ PASS |
| FR-003 — WHEN o usuário não é gerenciável pelo admin logado THEN seu checkbox fica desabilitado | checkbox `disabled` e ignorado pela seleção de página | `apps/frontend/src/features/admin/components/user-row.test.tsx:170` - `expect(checkbox).toBeDisabled()`; `apps/frontend/src/app/(authenticated)/admin/usuarios/admin-users-page.test.tsx:385` - `expect(...user-row-user-3...).toHaveAttribute("aria-checked", "false")` | ✅ PASS |
| FR-004 — WHEN há 1+ usuários selecionados THEN a `BulkActionBar` aparece com Ativar/Desativar/Limpar | barra renderizada com contagem e 3 botões | `apps/frontend/src/features/admin/components/bulk-action-bar.test.tsx:30` - `expect(screen.getByText("3 selecionados")).toBeInTheDocument()`; `apps/frontend/src/app/(authenticated)/admin/usuarios/admin-users-page.test.tsx:586` - `expect(screen.getByTestId("bulk-action-bar")).toBeInTheDocument()` | ✅ PASS |
| FR-005 — WHEN o admin clica em Ativar ou Desativar em massa THEN um diálogo de confirmação é exibido antes de prosseguir | `AlertDialog` com título e texto específicos para cada ação | `apps/frontend/src/features/admin/components/bulk-status-confirmation-dialog.test.tsx:19` - `expect(screen.getByRole("heading", { name: "Confirmar ativação em massa" })).toBeInTheDocument()`; `:44` - `expect(screen.getByRole("heading", { name: "Confirmar desativação em massa" })).toBeInTheDocument()`; `apps/frontend/src/app/(authenticated)/admin/usuarios/admin-users-page.test.tsx:475` - `expect(screen.getByRole("heading", { name: "Confirmar ativação em massa" })).toBeInTheDocument()` | ✅ PASS |
| FR-006 — WHEN a ação em massa é "Ativar" THEN usuários `locked` também são desbloqueados | status final `activated` para usuário previamente `locked` | `apps/backend/src/user/application/use-case/bulk-change-user-status.usecase.test.tsx:114` - `expect(updatedUser?.status).toBe("activated")` | ✅ PASS |
| FR-007 — WHEN a ação é submetida THEN a mudança de status é persistida como uma única operação de escrita no banco, independente de N | uma única chamada ao repositório em lote (`updateManyStatus`) | `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-user-repository.test.tsx:162` - `expect(firstCallCount).toBe(1)` (processa múltiplos IDs em uma chamada); `apps/backend/src/user/application/use-case/bulk-change-user-status.usecase.test.tsx:51` - `expect(result.value.requested).toBe(4)` com uma única execução do use case | ✅ PASS |
| FR-008 — WHEN a mesma solicitação é repetida THEN a segunda chamada não reaplica efeitos (idempotência) | segunda execução retorna `updated: 0` | `apps/backend/src/user/application/use-case/bulk-change-user-status.usecase.test.tsx:137` - `expect(secondResult.value.updated).toBe(0)`; `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-user-repository.test.tsx:176` - `expect(secondCallCount).toBe(0)` | ✅ PASS |
| FR-009 — WHEN o servidor recebe os IDs THEN revalida a autorização por usuário, ignorando inelegíveis | `skipped` conta inelegíveis (self/root/outro admin); elegíveis são atualizados | `apps/backend/src/user/application/use-case/bulk-change-user-status.usecase.test.tsx:51` - `expect(result.value.updated).toBe(1)` / `:52` `requested: 4` / `:53` `skipped: 3`; `apps/backend/src/user/infra/controller/bulk-activate-users.business-flow-test.tsx:80` - `expect(response.body).toEqual({ updated: 1, requested: 3, skipped: 2 })`; `apps/backend/src/user/domain/service/user-management-policy.test.tsx:58` - `expect(UserManagementPolicy.canChangeStatus(root, root)).toBe(false)` / `:72` `canChangeStatus(admin, otherAdmin).toBe(false)` | ✅ PASS |
| FR-010 — WHEN a operação termina THEN o sistema informa solicitados, atualizados e ignorados | resposta `{ updated, requested, skipped }` | `apps/backend/src/user/infra/controller/bulk-activate-users.business-flow-test.tsx:80` - `expect(response.body).toEqual({ updated: 1, requested: 3, skipped: 2 })`; `apps/backend/src/user/application/use-case/bulk-change-user-status.usecase.test.tsx:51-53` | ✅ PASS |
| FR-011 — WHEN o admin muda de página, filtro ou busca THEN a seleção é limpa automaticamente | checkboxes voltam a `aria-checked="false"` | `apps/frontend/src/app/(authenticated)/admin/usuarios/admin-users-page.test.tsx:399-406` (página); `:421-428` (filtro); `:443-452` (busca) | ✅ PASS |
| FR-012 — WHEN a solicitação contém mais de 100 IDs THEN o sistema rejeita com 400 | `400 Bad Request` para >100 IDs | `apps/backend/src/user/infra/controller/bulk-activate-users.business-flow-test.tsx:102` - `expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)`; `apps/backend/src/user/infra/controller/bulk-deactivate-users.business-flow-test.tsx:102` - `expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)` | ✅ PASS |
| Edge case — requester inexistente THEN retorna erro de autorização (`NotAllowedToManageUserError` / 403) | `failure(NotAllowedToManageUserError)` no use case e `403` no HTTP | `apps/backend/src/user/application/use-case/bulk-change-user-status.usecase.test.tsx:67` - `expect(result.isFailure()).toBe(true)` / `:69` `toBeInstanceOf(NotAllowedToManageUserError)`; `apps/backend/src/user/infra/controller/bulk-activate-users.business-flow-test.tsx:156` - `expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)` | ✅ PASS |
| Edge case — array vazio THEN 400 Bad Request | rejeição do schema Zod | `apps/backend/src/user/infra/controller/bulk-activate-users.business-flow-test.tsx:91` - `expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)` | ✅ PASS |
| Edge case — UUID inválido THEN 400 Bad Request | rejeição do schema Zod | `apps/backend/src/user/infra/controller/bulk-activate-users.business-flow-test.tsx:111` - `expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)` | ✅ PASS |
| Edge case — JWT ausente THEN 401; usuário MEMBER THEN 403 | proteção da rota | `apps/backend/src/user/infra/controller/bulk-activate-users.business-flow-test.tsx:119` - `expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)`; `:141` - `expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)` | ✅ PASS |
| Edge case — IDs duplicados na mesma requisição THEN deduplicados antes de calcular requested/skipped | `requested: 1` para três IDs iguais | `apps/backend/src/user/application/use-case/bulk-change-user-status.usecase.test.tsx:154` - `expect(result.value.requested).toBe(1)` / `:155` `skipped: 0` | ✅ PASS |
| Edge case — diálogo não fecha enquanto mutation está em voo THEN protege contra fechamento indevido | `Escape` durante `isPending` mantém o diálogo | `apps/frontend/src/app/(authenticated)/admin/usuarios/admin-users-page.test.tsx:557` - `expect(screen.getByRole("heading", { name: "Confirmar ativação em massa" })).toBeInTheDocument()`; `apps/frontend/src/features/admin/components/bulk-status-confirmation-dialog.test.tsx:97` - `expect(onOpenChange).not.toHaveBeenCalled()` | ✅ PASS |
| Edge case — confirmação chama mutation com os IDs selecionados e limpa a seleção ao suceder | body contém os IDs; barra some | `apps/frontend/src/app/(authenticated)/admin/usuarios/admin-users-page.test.tsx:519` - `expect(receivedBody.userIds?.sort()).toEqual(["user-1", "user-2"])`; `:520` - `expect(screen.queryByTestId("bulk-action-bar")).not.toBeInTheDocument()` | ✅ PASS |
| Edge case — "Limpar seleção" zera a seleção sem abrir diálogo | barra some, nenhum `alertdialog` | `apps/frontend/src/app/(authenticated)/admin/usuarios/admin-users-page.test.tsx:590` - `expect(screen.queryByTestId("bulk-action-bar")).not.toBeInTheDocument()`; `:591` - `expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()` | ✅ PASS |
| Edge case — cache de listagem e estatísticas invalidado após sucesso | `isInvalidated` true para as query keys | `apps/frontend/src/features/admin/api/use-bulk-change-user-status.test.tsx:80` - `expect(queryClient.getQueryState(adminUsersQueryKey(QUERY_PARAMS))?.isInvalidated).toBe(true)`; `:83` - `expect(queryClient.getQueryState(["user-stats"])?.isInvalidated).toBe(true)` | ✅ PASS |

**Coverage**: 21/21 criteria PASS · 0 gaps · 0 spec-precision gaps

---

## Discrimination Sensor

| # | File:line | Mutation | Killed? |
| --- | --- | --- | --- |
| M1 | `apps/backend/src/user/application/use-case/bulk-change-user-status.usecase.ts:44` | `if (!requester) return failure(...)` → `if (requester) return failure(...)` | ✅ Killed |
| M2 | `apps/backend/src/user/application/use-case/bulk-change-user-status.usecase.ts:51` | `UserManagementPolicy.canChangeStatus(requester, candidate)` → `true` | ✅ Killed |
| M3 | `apps/backend/src/user/application/use-case/bulk-change-user-status.usecase.ts:64` | `skipped: requested - updated` → `skipped: 0` | ✅ Killed |
| M4 | `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-user-repository.ts:76` | remove `&& user.status !== status` do filtro de `updateManyStatus` | ✅ Killed |
| M5 | `apps/backend/src/user/infra/controller/bulk-activate-users.controller.ts:64` | `targetStatus: "activated"` → `targetStatus: "suspended"` | ✅ Killed |
| M6 | `apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx:343` | remove a guarda `bulkChangeUserStatus.isPending` no fechamento do diálogo | ✅ Killed |
| M7 | `apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx:356` | remove o `remaining.delete(id)` no `onSuccess` da mutation | ✅ Killed |
| M8 | `apps/frontend/src/features/admin/api/use-bulk-change-user-status.ts:77` | invalida query key errada `["users"]` em vez de `[ADMIN_USERS_QUERY_KEY]` | ✅ Killed |
| M9 | `apps/frontend/src/features/admin/components/bulk-status-confirmation-dialog.tsx:70` | inverte a guarda `if (isPending)` para `if (!isPending)` no `Escape` | ✅ Killed |
| M10 | `apps/frontend/src/features/admin/components/user-row.tsx:154` | `disabled={selectDisabled}` → `disabled={false}` | ✅ Killed |
| M11 | `apps/frontend/src/features/admin/components/user-row.tsx:147` | `Boolean(isSelected || checked)` → `Boolean(false)` | ✅ Killed |

**Depth**: lightweight (capado em 10)
**Result**: 11/11 killed - PASS ✅

Post-sensor tree state: a árvore real não foi alterada pelos batches (`realTreeDirtied: false` em ambos); o `git status` mostra apenas as modificações prévias em `apps/backend/AGENTS.md` e `apps/frontend/AGENTS.md` e o novo relatório.

---

## Verdict

**PASS ✅** - Todos os critérios de aceitação estão cobertos por asserções concretas (file:line), a operação em lote é exercitada pelo contrato `updateManyStatus` do repositório e todos os 11 mutantes injetados foram mortos. A garantia de "uma única operação de escrita" reside na implementação do repositório (`updateMany`) e não é reforçada por uma contagem de queries SQL.

**Lessons recorded**: none (clean PASS)
