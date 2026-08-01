# gym-deactivation - Independent Validation

**Date**: 2026-07-31
**Spec**: docs/superpowers/gym-deactivation/specs/gym-deactivation-design.md
**PRD**: docs/superpowers/gym-deactivation/prd/prd-gym-deactivation.md
**Diff range**: 600bb57d..1aecfb75
**Verifier**: INDEPENDENT
**Sensor depth**: 17 mutations across 13 logic files — apps/backend/src/gym/domain/value-object/gym-status.ts: 2/2 branches, apps/backend/src/gym/application/use-case/deactivate-gym.usecase.ts: 1/1 branches, apps/backend/src/gym/application/use-case/activate-gym.usecase.ts: 1/1 branches, apps/backend/src/check-in/application/use-case/check-in.usecase.ts: 1/3 branches, apps/backend/src/gym/infra/controller/fetch-gym-by-id.controller.ts: 1/2 branches, apps/backend/src/gym/infra/controller/deactivate-gym.controller.ts: 1/1 branches, apps/backend/src/gym/infra/controller/activate-gym.controller.ts: 1/1 branches, apps/backend/src/shared/infra/database/repository/in-memory/in-memory-gym-repository.ts: 3/6 branches, apps/frontend/src/app/(authenticated)/academias/[id]/page.tsx: 2/5 branches, apps/frontend/src/features/gyms/components/gym-card.tsx: 1/1 branches, apps/frontend/src/features/gyms/components/gym-row.tsx: 1/1 branches, apps/frontend/src/features/gyms/components/gym-status-confirmation-dialog.tsx: 1/1 branches, apps/frontend/src/features/gyms/api/index.ts: 1/2 branches

---

## Gate Check

- **Command**: `pnpm --filter backend test:run && pnpm --filter backend test:business-flow` e `pnpm --filter frontend test`
- **Result**: backend `test:run` 706 passed (706), 121 arquivos — exit 0; backend `test:business-flow` 181 passed (181), 44 arquivos — exit 0; frontend `test` suíte completa executada como baseline dos ciclos de mutação, todos os arquivos relevantes verdes. Falhas pré-existentes e não relacionadas a esta feature (não reportadas como gap, conforme instrução de dispatch): `check-in.contract-test.ts` "409 para check-in inexistente", `gym.contract-test.ts` "POST /gyms ... status 201", `architecture-dependency-check.fit-test.ts` "camada de aplicação não deve depender da camada de infraestrutura".
- **Typecheck/build**: não executado nesta verificação (fora do escopo do dispatch; não solicitado).

---

## Spec-Anchored Acceptance Criteria

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion expression | Result |
| --- | --- | --- | --- |
| AC-01 (FR-001) WHEN admin desativa academia ativa THEN sucesso e status vira "deactivated" | `result.isSuccess()` true, `gym.status === "deactivated"` | `apps/backend/src/gym/application/use-case/deactivate-gym.usecase.test.ts:32,36` - `expect(result.isSuccess()).toBe(true)`; `expect(updated?.status).toBe("deactivated")` | ✅ PASS |
| AC-02 (FR-002) WHEN admin reativa academia desativada THEN sucesso e status vira "activated" | `result.isSuccess()` true, `gym.status === "activated"` | `apps/backend/src/gym/application/use-case/activate-gym.usecase.test.ts:35,39` - `expect(result.isSuccess()).toBe(true)`; `expect(updated?.status).toBe("activated")` | ✅ PASS |
| AC-03 (FR-003) WHEN status muda THEN botão exibe ícone/label distintos por estado | aria-label "Desativar academia X" quando ativa, "Reativar academia X" quando desativada (deriva ícone/cor via `getStatusConfig`) | `apps/frontend/src/app/(authenticated)/academias/[id]/page.test.tsx:345-347,391-393` - `screen.findByRole("button",{name:"Desativar academia Iron Gym"})` / `{name:"Reativar academia Iron Gym"}` | ✅ PASS |
| AC-04 (FR-004) WHEN admin clica no botão de alternância THEN modal de confirmação com texto da consequência é exibido, com opção de confirmar | título/descrição específicos por ação; botão "Confirmar desativação"/"Confirmar reativação" | `apps/frontend/src/features/gyms/components/gym-status-confirmation-dialog.test.tsx:20-28,43-51` - `screen.getByRole("heading",{name:"Confirmar desativação"})`; `screen.getByText(/deixará de aparecer nas buscas/i)` | ⚠️ Spec-precision gap (parcial) |
| AC-05 (FR-005) WHEN requisição de desativar/reativar é feita por não-admin THEN erro de autorização (403) | `response.status === 403` | `apps/backend/src/gym/infra/controller/deactivate-gym.controller.test.ts:99` e `activate-gym.controller.test.ts:103` - `expect(response.status).toBe(403)` | ✅ PASS |
| AC-06 (FR-006) WHEN não-admin busca academias (geral/textual/proximidade) THEN academia desativada não aparece | resultado não contém a academia desativada | `apps/backend/src/gym/application/use-case/fetch-all-gyms.usecase.test.ts:115`, `search-gym.usecase.test.ts:80`, `fetch-nearby-gym.usecase.test.ts:116,135` - `expect(gyms).toHaveLength(0)` (fetchNearby) e equivalentes para fetchAll/search | ✅ PASS |
| AC-07 (FR-007) WHEN não-admin tenta check-in em academia desativada THEN mesmo erro de "academia inexistente" (`GymNotFoundError`) | `failure(GymNotFoundError)` | `apps/backend/src/check-in/application/use-case/check-in.usecase.test.ts:182,199` - `expect(result.forceFailure().value).toBeInstanceOf(GymNotFoundError)` | ✅ PASS |
| AC-08 (FR-008) WHEN não-admin acessa URL de detalhe de academia desativada diretamente THEN mesmo erro de "não existe" (404) | `response.status === 404` | `apps/backend/src/gym/infra/controller/fetch-gym-by-id.controller.test.ts:91` - `expect(response.status).toBe(404)` | ✅ PASS |
| AC-09 (FR-009) WHEN admin acessa detalhe de academia desativada THEN visualiza normalmente (200, status "deactivated" no DTO) | `response.status === 200`, corpo com `status: "deactivated"` | `apps/backend/src/gym/infra/controller/fetch-gym-by-id.controller.test.ts:77` - `expect(response.status).toBe(200)` | ✅ PASS |
| AC-10 (FR-010) WHEN admin tenta desativar já-desativada ou reativar já-ativa THEN erro de conflito (409), sem alterar estado | `response.status === 409`; `updateSpy` não chamado | `apps/backend/src/gym/infra/controller/deactivate-gym.controller.test.ts:122` - `expect(response.status).toBe(409)`; `apps/backend/src/gym/application/use-case/deactivate-gym.usecase.test.ts:59` - `expect(updateSpy).not.toHaveBeenCalled()` | ✅ PASS |
| AC-11 (FR-011) WHEN academia é desativada/reativada THEN nunca há exclusão física de academia ou check-ins | migração adiciona coluna `status`, sem `DROP`/`DELETE` | `apps/backend/prisma/migrations/20260731190554_add_gym_status/migration.sql:1-5` - `ALTER TABLE "gyms" ADD COLUMN "status" "GymStatus" NOT NULL DEFAULT 'activated'` (sem `DELETE`/`DROP` na migração; sem `deleted_at`) | ✅ PASS |
| AC-12 (FR-012) WHEN admin visualiza lista de busca THEN academias desativadas exibem selo "Desativada"; não-admin não vê o selo | selo "Desativada" visível apenas quando `adminEditHref` truthy + `status === "deactivated"` | `apps/frontend/src/features/gyms/components/gym-card.test.tsx:90-99,102-107` - `expect(screen.getByText("Desativada")).toBeInTheDocument()`; `expect(screen.queryByText("Desativada")).not.toBeInTheDocument()` (sem adminEditHref); análogo em `gym-row.test.tsx:75-91` | ✅ PASS |
| AC-13 (D1) WHEN `includeInactive` é omitido nos use-cases de leitura THEN default fail-closed (academia desativada oculta) | `includeInactive: input.includeInactive ?? false` nos use-cases | `apps/backend/src/gym/application/use-case/fetch-gym-by-id.usecase.test.ts:130` - "com includeInactive omitido, o default fail-closed: academia desativada retorna failure(GymNotFoundError)" | ✅ PASS |
| AC-14 (Spec "Testes", linha 176) WHEN ciclo completo desativar → check-in bloqueado → reativar → check-in funciona de novo THEN comportamento espelha os `business-flow-test.ts` já existentes no módulo `gym` | teste de fluxo completo dedicado, no padrão `*.business-flow-test.ts` | não localizado (busca: `grep -rl "reativ\|desativ" apps/backend/src --include="*.business-flow-test.ts"` sem resultados; diff do range só toca `fetch-all-gyms.business-flow-test.ts`, `fetch-gym-by-id.business-flow-test.ts`, `search-gym.business-flow-test.ts`, e as três alterações são apenas adição de token de autenticação membro às rotas que passaram a `isProtected: true`, não novas asserções de ciclo desativar/check-in/reativar) | ❌ Gap (uncovered) |

**Coverage**: 13/14 criteria PASS · 1 gap · 1 spec-precision gap

---

## Discrimination Sensor

| # | File:line | Mutation | Killed? |
| --- | --- | --- | --- |
| 1 | `apps/backend/src/gym/domain/value-object/gym-status.ts:36` | `return success(undefined)` → `return failure(new GymAlreadyDeactivatedError())` (ActivatedStatus.deactivate) | ✅ Killed |
| 2 | `apps/backend/src/gym/domain/value-object/gym-status.ts:50` | `return failure(new GymAlreadyDeactivatedError())` → `return success(undefined)` (DeactivatedStatus.deactivate guard) | ✅ Killed |
| 3 | `apps/backend/src/gym/application/use-case/deactivate-gym.usecase.ts:33` | `includeInactive: true` → `includeInactive: false` | ✅ Killed |
| 4 | `apps/backend/src/gym/application/use-case/activate-gym.usecase.ts:33` | `includeInactive: true` → `includeInactive: false` | ✅ Killed |
| 5 | `apps/backend/src/check-in/application/use-case/check-in.usecase.ts:87` | `includeInactive: false` → `includeInactive: true` | ✅ Killed |
| 6 | `apps/backend/src/gym/infra/controller/fetch-gym-by-id.controller.ts:62` | `includeInactive: isAdmin` → `includeInactive: true` | ✅ Killed |
| 7 | `apps/backend/src/gym/infra/controller/deactivate-gym.controller.ts:41` | `onlyAdmin: true` → `onlyAdmin: false` | ✅ Killed |
| 8 | `apps/backend/src/gym/infra/controller/activate-gym.controller.ts:41` | `onlyAdmin: true` → `onlyAdmin: false` | ✅ Killed |
| 9 | `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-gym-repository.ts:67` | `options?.includeInactive === false` → `options?.includeInactive === true` (gymOfId) | ✅ Killed |
| 10 | `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-gym-repository.ts:80` | `input.includeInactive === false` → `input.includeInactive === true` (fetchGyms) | ✅ Killed |
| 11 | `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-gym-repository.ts:107` | `options?.includeInactive === false` → `options?.includeInactive === true` (fetchNearbyCoord) | ✅ Killed |
| 12 | `apps/frontend/src/app/(authenticated)/academias/[id]/page.tsx:161` | `if (isDeactivated) {` → `if (!isDeactivated) {` (getStatusConfig) | ✅ Killed |
| 13 | `apps/frontend/src/app/(authenticated)/academias/[id]/page.tsx:184` | `err.status === 409` → `err.status !== 409` (getErrorMessage) | ✅ Killed |
| 14 | `apps/frontend/src/features/gyms/components/gym-card.tsx:17` | `status === "deactivated"` → `status === "activated"` | ✅ Killed |
| 15 | `apps/frontend/src/features/gyms/components/gym-row.tsx:16` | `status === "deactivated"` → `status === "activated"` | ✅ Killed |
| 16 | `apps/frontend/src/features/gyms/components/gym-status-confirmation-dialog.tsx:40` | `confirmLabel: "Confirmar desativação"` → `confirmLabel: "Confirmar reativação"` | ✅ Killed |
| 17 | `apps/frontend/src/features/gyms/api/index.ts:251` | `"/gyms/{gymId}/deactivate"` → `"/gyms/{gymId}/activate"` | ✅ Killed |

**Depth**: P0-full (≥5, feature de integridade de dados + autorização)
**Result**: 17/17 killed - PASS ✅

Post-sensor tree state: `git status --porcelain` empty, `git diff --stat` empty.

---

## Gaps → Fix Tasks

### FIX-01 - Teste de fluxo completo desativar → check-in bloqueado → reativar → check-in funciona ausente

- **What**: criar um teste `*.business-flow-test.ts` no módulo `gym` (ou `check-in`) cobrindo o ciclo completo: admin desativa a academia via `PATCH /gyms/:id/deactivate` → membro tenta check-in e recebe o erro de "academia inexistente" → admin reativa via `PATCH /gyms/:id/activate` → membro tenta check-in novamente e o check-in é criado com sucesso.
- **Where**: novo arquivo em `apps/backend/src/gym/infra/controller/` (ex.: `gym-deactivation.business-flow-test.ts`), espelhando o padrão de setup (auth admin + membro, `serverBuildForTest`, `InMemoryGymRepository`/`InMemoryCheckInRepository`) já usado em `fetch-gym-by-id.business-flow-test.ts` e nos demais `*.business-flow-test.ts` do módulo `gym`.
- **Verify**: `pnpm --filter backend test:business-flow` executa o novo arquivo e ele falha se qualquer etapa do ciclo (desativação, bloqueio de check-in, reativação, check-in pós-reativação) regredir.
- **Done-when**: o teste existe, passa na suíte `test:business-flow`, e a linha 176 (seção "Testes") da spec de design passa a ter evidência `file:line` localizável.

### FIX-02 - Opção "cancelar" do `GymStatusConfirmationDialog` sem asserção de teste dedicada

- **What**: FR-004 exige que o modal ofereça "opções de confirmar ou cancelar"; o botão `AlertDialogCancel` ("Cancelar") está implementado (`gym-status-confirmation-dialog.tsx:74`), mas nenhum teste em `gym-status-confirmation-dialog.test.tsx` ou em `page.test.tsx` clica nele/verifica que ele fecha o modal sem disparar `onConfirm`.
- **Where**: `apps/frontend/src/features/gyms/components/gym-status-confirmation-dialog.test.tsx`.
- **Verify**: novo `test()` que clica em "Cancelar" e verifica `onConfirm` não chamado e/ou `onOpenChange(false)` chamado.
- **Done-when**: o teste existe e passa; a lacuna some da tabela de AC-anchored coverage.

---

## Verdict

**FAIL ❌** - 13/14 critérios PASS e sensor de discriminação 17/17 mutantes mortos (nenhum sobrevivente), mas a linha 176 da seção "Testes" da spec ("Fluxo completo: desativar → check-in bloqueado → reativar → check-in funciona de novo") não tem nenhum teste correspondente no código (busca exaustiva por `business-flow-test.ts` tocando o ciclo completo não encontrou nada, e os três arquivos `*.business-flow-test.ts` alterados no range só adicionam token de autenticação de membro a rotas que passaram a `isProtected: true`) — isso é um gap real, não um argumento. Adicionalmente, a metade "cancelar" de FR-004 carece de asserção de teste dedicada (spec-precision gap). Por regra do gate, qualquer ❌/⚠️ força FAIL mesmo com sensor limpo.

**Lessons recorded**: L-003 (ac_gap: spec de teste "fluxo completo" não implementada apesar de listada explicitamente na seção Testes da design spec), L-004 (spec_precision_gap: caminho de cancelamento do modal de confirmação sem asserção dedicada)
