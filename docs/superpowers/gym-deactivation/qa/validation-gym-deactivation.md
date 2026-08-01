# gym-deactivation - Independent Validation

**Date**: 2026-07-31
**Spec**: docs/superpowers/gym-deactivation/specs/gym-deactivation-design.md
**PRD**: docs/superpowers/gym-deactivation/prd/prd-gym-deactivation.md
**Diff range**: 600bb57d..6aa3aaa1
**Verifier**: INDEPENDENT
**Sensor depth**: 21 mutations across 13 logic files — apps/backend/src/gym/domain/value-object/gym-status.ts: 2/2 branches, apps/backend/src/gym/application/use-case/deactivate-gym.usecase.ts: 1/1 branches, apps/backend/src/gym/application/use-case/activate-gym.usecase.ts: 2/1 branches, apps/backend/src/check-in/application/use-case/check-in.usecase.ts: 2/3 branches, apps/backend/src/gym/infra/controller/fetch-gym-by-id.controller.ts: 1/2 branches, apps/backend/src/gym/infra/controller/deactivate-gym.controller.ts: 1/1 branches, apps/backend/src/gym/infra/controller/activate-gym.controller.ts: 1/1 branches, apps/backend/src/shared/infra/database/repository/in-memory/in-memory-gym-repository.ts: 3/6 branches, apps/frontend/src/app/(authenticated)/academias/[id]/page.tsx: 2/5 branches, apps/frontend/src/features/gyms/components/gym-card.tsx: 1/1 branches, apps/frontend/src/features/gyms/components/gym-row.tsx: 1/1 branches, apps/frontend/src/features/gyms/components/gym-status-confirmation-dialog.tsx: 3/3 branches, apps/frontend/src/features/gyms/api/index.ts: 1/2 branches

---

## Gate Check

- **Command**: `pnpm --filter backend test:run`, `pnpm --filter backend test:business-flow`, `pnpm --filter backend test:contract`, `pnpm --filter frontend test`
- **Result**: backend `test:run` — 706 passed (706), 121 arquivos, exit 0 (executado por mim nesta rodada). backend `test:business-flow` — 182 passed (182), 45 arquivos, exit 0 (executado por mim nesta rodada; inclui o novo `deactivate-reactivate-gym-checkin.business-flow-test.ts`, que a rodada anterior apontou como ausente). backend `test:contract` — 2 failed, 30 passed (32), exit 1 (executado por mim; as duas falhas são exatamente as pré-existentes e não relacionadas listadas no dispatch: `check-in.contract-test.ts` "409 para check-in inexistente" e `gym.contract-test.ts` "POST /gyms ... status 201", ambas medidas na base `600bb57d`, fora do escopo desta feature). frontend `test` — 755 passed (755), 128 arquivos, exit 0 (executado por mim nesta rodada; inclui os 2 novos testes do caminho "Cancelar" em `gym-status-confirmation-dialog.test.tsx`).
- **Typecheck/build**: não executado nesta verificação (fora do escopo do dispatch; `openapi:generate-client` já documentado como quebrado por incompatibilidade `openapi-typescript@7.13.0`/`typescript@7.0.2`, pré-existente e não desta feature).

---

## Spec-Anchored Acceptance Criteria

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion expression | Result |
| --- | --- | --- | --- |
| AC-01 (FR-001) WHEN admin desativa academia ativa THEN sucesso e status vira "deactivated" | `result.isSuccess()` true, `gym.status === "deactivated"` | `apps/backend/src/gym/application/use-case/deactivate-gym.usecase.test.ts:32,36` - `expect(result.isSuccess()).toBe(true)`; `expect(updated?.status).toBe("deactivated")` | ✅ PASS |
| AC-02 (FR-002) WHEN admin reativa academia desativada THEN sucesso e status vira "activated" | `result.isSuccess()` true, `gym.status === "activated"` | `apps/backend/src/gym/application/use-case/activate-gym.usecase.test.ts:35,39` - `expect(result.isSuccess()).toBe(true)`; `expect(updated?.status).toBe("activated")` | ✅ PASS |
| AC-03 (FR-003) WHEN status muda THEN botão exibe ícone/label distintos por estado | aria-label "Desativar academia X" quando ativa, "Reativar academia X" quando desativada | `apps/frontend/src/app/(authenticated)/academias/[id]/page.test.tsx:346,392` - `screen.findByRole("button",{name:"Desativar academia Iron Gym"})` / `{name:"Reativar academia Iron Gym"}` | ✅ PASS |
| AC-04 (FR-004) WHEN admin clica no botão de alternância THEN modal de confirmação com texto da consequência é exibido, com opções de confirmar OU cancelar | título/descrição específicos por ação; "Confirmar desativação"/"Confirmar reativação"; "Cancelar" fecha sem confirmar | `apps/frontend/src/features/gyms/components/gym-status-confirmation-dialog.test.tsx:20-28,43-51` (confirmar) e `:91-109` (cancelar, adicionado no commit `6aa3aaa1`) - `screen.getByRole("heading",{name:"Confirmar desativação"})`; `expect(onOpenChange).toHaveBeenCalledWith(false)`; `expect(onConfirm).not.toHaveBeenCalled()` | ✅ PASS |
| AC-05 (FR-005) WHEN requisição de desativar/reativar é feita por não-admin THEN erro de autorização (403) | `response.status === 403` | `apps/backend/src/gym/infra/controller/deactivate-gym.controller.test.ts:99` e `activate-gym.controller.test.ts:103` - `expect(response.status).toBe(403)` | ✅ PASS |
| AC-06 (FR-006) WHEN não-admin busca academias (geral/textual/proximidade) THEN academia desativada não aparece | resultado não contém a academia desativada | `fetch-all-gyms.usecase.test.ts:127`, `search-gym.usecase.test.ts:92`, `fetch-nearby-gym.usecase.test.ts:135` - `expect(result.data.some((g) => g.id === deactivatedGym.id)).toBe(false)` (fetchAll/search); `expect(gyms).toHaveLength(0)` (fetchNearby) | ✅ PASS |
| AC-07 (FR-007) WHEN não-admin tenta check-in em academia desativada THEN mesmo erro de "academia inexistente" (`GymNotFoundError`) | `failure(GymNotFoundError)` | `apps/backend/src/check-in/application/use-case/check-in.usecase.test.ts:182,199` - `expect(result.forceFailure().value).toBeInstanceOf(GymNotFoundError)`; reforçado a nível HTTP em `deactivate-reactivate-gym-checkin.business-flow-test.ts:124-127` - `expect(checkInOnDeactivatedGym.status).toBe(checkInOnNonExistentGym.status)`; `expect(checkInOnDeactivatedGym.body).toEqual(checkInOnNonExistentGym.body)` | ✅ PASS |
| AC-08 (FR-008) WHEN não-admin acessa URL de detalhe de academia desativada diretamente THEN mesmo erro de "não existe" (404) | `response.status === 404` | `apps/backend/src/gym/infra/controller/fetch-gym-by-id.controller.test.ts:91` - `expect(response.status).toBe(404)` | ✅ PASS |
| AC-09 (FR-009) WHEN admin acessa detalhe de academia desativada THEN visualiza normalmente (200, status "deactivated" no DTO) | `response.status === 200` | `apps/backend/src/gym/infra/controller/fetch-gym-by-id.controller.test.ts:77` - `expect(response.status).toBe(200)` | ✅ PASS |
| AC-10 (FR-010) WHEN admin tenta desativar já-desativada ou reativar já-ativa THEN erro de conflito (409), sem alterar estado | `response.status === 409` | `apps/backend/src/gym/infra/controller/deactivate-gym.controller.test.ts:122` - `expect(response.status).toBe(409)` | ✅ PASS |
| AC-11 (FR-011) WHEN academia é desativada/reativada THEN nunca há exclusão física de academia ou check-ins | migração adiciona coluna `status`, sem `DROP`/`DELETE` | `apps/backend/prisma/migrations/20260731190554_add_gym_status/migration.sql:1-5` - `ALTER TABLE "gyms" ADD COLUMN "status" "GymStatus" NOT NULL DEFAULT 'activated'` (sem `DELETE`/`DROP`); reforçado por `update-gym.usecase.test.ts:116` - `expect(found?.status).toBe("deactivated")` (editar uma academia desativada não a reativa silenciosamente) | ✅ PASS |
| AC-12 (FR-012) WHEN admin visualiza lista de busca THEN academias desativadas exibem selo "Desativada"; não-admin não vê o selo | selo visível apenas quando `adminEditHref` truthy + `status === "deactivated"` | `gym-card.test.tsx:98,105` - `expect(screen.getByText("Desativada")).toBeInTheDocument()`; `expect(screen.queryByText("Desativada")).not.toBeInTheDocument()`; análogo em `gym-row.test.tsx:83,90` | ✅ PASS |
| AC-13 (D1) WHEN `includeInactive` é omitido nos use-cases de leitura THEN default fail-closed (academia desativada oculta) | `includeInactive: input.includeInactive ?? false` | `fetch-gym-by-id.usecase.test.ts:130` - "com includeInactive omitido, o default fail-closed: academia desativada retorna failure(GymNotFoundError)"; código-fonte confirmado em `fetch-gym-by-id.usecase.ts:46` | ✅ PASS |
| AC-14 (Spec "Testes", linha 176) WHEN ciclo completo desativar → check-in bloqueado → reativar → check-in funciona de novo THEN comportamento espelha os `business-flow-test.ts` já existentes no módulo `gym`, incluindo D2 (404 idêntico ao de academia inexistente) | teste de fluxo completo dedicado, no padrão `*.business-flow-test.ts`, com comparação byte-a-byte do 404 | `apps/backend/src/gym/infra/controller/deactivate-reactivate-gym-checkin.business-flow-test.ts:89-148` (adicionado no commit `6aa3aaa1`) - `expect(deactivateResponse.status).toBe(HTTP_STATUS.OK)` → `expect(checkInOnDeactivatedGym.status).toBe(HTTP_STATUS.NOT_FOUND)` → `expect(checkInOnDeactivatedGym.status).toBe(checkInOnNonExistentGym.status)` e `expect(checkInOnDeactivatedGym.body).toEqual(checkInOnNonExistentGym.body)` (D2) → `expect(activateResponse.status).toBe(HTTP_STATUS.OK)` → `expect(checkInAfterReactivation.status).toBe(HTTP_STATUS.CREATED)` | ✅ PASS |

**Coverage**: 14/14 criteria PASS · 0 gaps · 0 spec-precision gaps

Nota: a rodada anterior (range `600bb57d..1aecfb75`) marcou AC-14 como ❌ Gap e AC-04 como ⚠️ Spec-precision gap (metade "cancelar" sem asserção). Ambos foram fechados no commit `6aa3aaa1`, verificados acima com evidência própria (não apenas na palavra do autor): o novo arquivo de fluxo completo existe e roda em `test:business-flow` (confirmado por mim, ver Gate Check), e o teste do caminho "Cancelar" foi lido e confere clique em "Cancelar" → `onOpenChange(false)` chamado e `onConfirm` não chamado.

---

## Discrimination Sensor

| # | File:line | Mutation | Killed? |
| --- | --- | --- | --- |
| 1 | `apps/backend/src/gym/domain/value-object/gym-status.ts:36` | `return success(undefined)` → `return failure(new GymAlreadyDeactivatedError())` (ActivatedStatus.deactivate) — executado nesta rodada | ✅ Killed |
| 2 | `apps/backend/src/gym/domain/value-object/gym-status.ts:50` | `return failure(new GymAlreadyDeactivatedError())` → `return success(undefined)` (DeactivatedStatus.deactivate guard) — reusado, arquivo inalterado desde `1aecfb75` (`git diff --stat 1aecfb75..6aa3aaa1` não toca este arquivo) | ✅ Killed |
| 3 | `apps/backend/src/gym/application/use-case/deactivate-gym.usecase.ts:33` | `includeInactive: true` → `includeInactive: false` — executado nesta rodada | ✅ Killed |
| 4 | `apps/backend/src/gym/application/use-case/activate-gym.usecase.ts:33` | `includeInactive: true` → `includeInactive: false`, suíte completa — reusado, arquivo inalterado | ✅ Killed |
| 5 | `apps/backend/src/gym/application/use-case/activate-gym.usecase.ts:33` | mesma mutação, mas `--test` restrito a `test:business-flow` executando SOMENTE `deactivate-reactivate-gym-checkin.business-flow-test.ts` — executado nesta rodada; isola o poder de discriminação do novo arquivo (FIX-01) da metade "reativar" do ciclo | ✅ Killed |
| 6 | `apps/backend/src/check-in/application/use-case/check-in.usecase.ts:87` | `includeInactive: false` → `includeInactive: true`, suíte completa — reusado, arquivo inalterado | ✅ Killed |
| 7 | `apps/backend/src/check-in/application/use-case/check-in.usecase.ts:87` | mesma mutação, mas `--test` restrito a rodar SOMENTE `deactivate-reactivate-gym-checkin.business-flow-test.ts` (`test:business-flow`) — executado nesta rodada; isola o poder de discriminação do novo arquivo (FIX-01) da metade "desativar bloqueia check-in" do ciclo | ✅ Killed |
| 8 | `apps/backend/src/gym/infra/controller/fetch-gym-by-id.controller.ts:62` | `includeInactive: isAdmin` → `includeInactive: true` — reusado, arquivo inalterado | ✅ Killed |
| 9 | `apps/backend/src/gym/infra/controller/deactivate-gym.controller.ts:41` | `onlyAdmin: true` → `onlyAdmin: false` — executado nesta rodada | ✅ Killed |
| 10 | `apps/backend/src/gym/infra/controller/activate-gym.controller.ts:41` | `onlyAdmin: true` → `onlyAdmin: false` — reusado, arquivo inalterado | ✅ Killed |
| 11 | `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-gym-repository.ts:67` | `options?.includeInactive === false` → `options?.includeInactive === true` (gymOfId) — executado nesta rodada | ✅ Killed |
| 12 | `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-gym-repository.ts:80` | `input.includeInactive === false` → `input.includeInactive === true` (fetchGyms) — reusado, arquivo inalterado | ✅ Killed |
| 13 | `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-gym-repository.ts:107` | `options?.includeInactive === false` → `options?.includeInactive === true` (fetchNearbyCoord) — reusado, arquivo inalterado | ✅ Killed |
| 14 | `apps/frontend/src/app/(authenticated)/academias/[id]/page.tsx:161` | `if (isDeactivated) {` → `if (!isDeactivated) {` (getStatusConfig) — executado nesta rodada | ✅ Killed |
| 15 | `apps/frontend/src/app/(authenticated)/academias/[id]/page.tsx:184` | `err.status === 409` → `err.status !== 409` (getErrorMessage) — reusado, arquivo inalterado entre `1aecfb75` e `6aa3aaa1` | ✅ Killed |
| 16 | `apps/frontend/src/features/gyms/components/gym-card.tsx:17` | `status === "deactivated"` → `status === "activated"` — executado nesta rodada | ✅ Killed |
| 17 | `apps/frontend/src/features/gyms/components/gym-row.tsx:16` | `status === "deactivated"` → `status === "activated"` — reusado, arquivo inalterado | ✅ Killed |
| 18 | `apps/frontend/src/features/gyms/components/gym-status-confirmation-dialog.tsx:40` | `confirmLabel: "Confirmar desativação"` → `confirmLabel: "Confirmar reativação"` — reusado, arquivo de origem inalterado (só o `.test.tsx` mudou em `6aa3aaa1`) | ✅ Killed |
| 19 | `apps/frontend/src/features/gyms/components/gym-status-confirmation-dialog.tsx:74` | `<AlertDialogCancel disabled={isPending}>` → `<AlertDialogCancel disabled={false}>` — executado nesta rodada; mata via o novo teste "durante isPending, botão Cancelar fica disabled" (FIX-02) | ✅ Killed |
| 20 | `apps/frontend/src/features/gyms/components/gym-status-confirmation-dialog.tsx:74` | `<AlertDialogCancel disabled={isPending}>` → `<AlertDialogCancel disabled={isPending} onClick={onConfirm}>` (bug simulado: cancelar dispararia confirmação) — executado nesta rodada; mata via o novo teste "click botão Cancelar ... não chama onConfirm" (FIX-02) | ✅ Killed |
| 21 | `apps/frontend/src/features/gyms/api/index.ts:251` | `"/gyms/{gymId}/deactivate"` → `"/gyms/{gymId}/activate"` — reusado, arquivo inalterado | ✅ Killed |

**Depth**: P0-full (≥5, feature de integridade de dados + autorização)
**Result**: 21/21 killed - PASS ✅

Metodologia desta rodada: dos 21 mutantes, **10 foram executados por mim nesta verificação** (linhas 1, 3, 5, 7, 9, 11, 14, 16, 19, 20 — ciclo `git stash`/scratch → mutação → suíte → `killed`/`survived` observado → restauração, via `run-mutation.cjs`), incluindo os 4 mutantes novos (5, 7, 19, 20) desenhados especificamente para provar que os dois fixes da rodada anterior (FIX-01, FIX-02) têm poder de discriminação real, não apenas suítes verdes. Os 11 restantes são **reusados** da rodada anterior (range `600bb57d..1aecfb75`): confirmei via `git diff --stat 1aecfb75..6aa3aaa1` que nenhum desses arquivos-fonte mudou neste range (o commit `6aa3aaa1` só tocou os dois arquivos de teste citados no dispatch), então a leitura `killed` original permanece válida — não estou tomando a palavra do autor, estou verificando que o arquivo mutado é byte-idêntico ao que já foi executado.

Post-sensor tree state: `git status --porcelain` empty, `git diff --stat` empty (confirmado após cada um dos 10 ciclos executados nesta rodada).

---

## Gaps → Fix Tasks

Nenhum. Cobertura 14/14 ACs, sensor 21/21 mortos, sem sobreviventes.

---

## Verdict

**PASS ✅** - Os dois gaps da rodada anterior (`600bb57d..1aecfb75`) foram fechados no commit `6aa3aaa1` e verificados de forma independente, não apenas aceitos por declaração do autor: (1) `deactivate-reactivate-gym-checkin.business-flow-test.ts` cobre o ciclo completo desativar → check-in bloqueado → reativar → check-in funciona de novo, e adicionalmente prova a garantia D2 comparando status e corpo do 404 de academia desativada contra o 404 de academia genuinamente inexistente byte a byte; confirmei isso rodando a suíte `test:business-flow` (182/182) e, no sensor, isolando esse arquivo sozinho contra 2 mutações que ele mata sem depender da suíte unitária. (2) `gym-status-confirmation-dialog.test.tsx` ganhou os testes do caminho "cancelar" exigido por FR-004, e 2 mutações novas no sensor (remover o `disabled` durante pending e simular o bug de ligar Cancelar a `onConfirm`) confirmam que essas asserções realmente detectam regressão. 14/14 critérios de aceitação PASS com evidência própria em `file:line`, sensor de discriminação 21/21 mutantes mortos (0 sobreviventes, 10 executados nesta rodada incluindo os 4 novos que provam os fixes, 11 reusados de arquivos comprovadamente inalterados), gate de testes verde nas 4 suítes relevantes com as únicas falhas sendo as 2 pré-existentes e não relacionadas já documentadas na base `600bb57d`.

**Lessons recorded**: none (clean PASS)
