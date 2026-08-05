# Task 3: BulkChangeUserStatusUseCase — escrita idempotente, desbloqueio e resposta agregada [FR-006, FR-007, FR-008, FR-010]

**Status:** DONE
**PRD:** ../prd/prd-bulk-user-status-actions.md
**Spec:** ../specs/bulk-user-status-actions-design.md
**Tier:** standard
**Depends on:** task-01, task-02

## Visão Geral

A Task 02 deixou `BulkChangeUserStatusUseCase.execute()` retornando uma estrutura
intermediária (`{ eligibleIds, skippedCount, requestedCount }`) sem persistir nada. Esta
task completa o use case: chama `updateManyStatus(eligibleIds, targetStatus)` (Task 01)
para persistir a mudança em uma única escrita, invalida o cache (mesmo padrão de
`SuspendUserUseCase`/`ActiveUserUseCase`: `cacheDB.deleteByPattern("fetch-users:*")` e
`cacheDB.delete(USER_STATS_CACHE_KEY)`), e troca o formato de retorno para o contrato
final `{ updated, requested, skipped }` que a API expõe (FR-010). Como o `where` do
`updateManyStatus` já usa `status: { not: targetStatus }`, um usuário `locked`
selecionado para "Ativar" em massa é automaticamente desbloqueado — não há branch de
código separado para isso (FR-006). Uma segunda chamada idêntica sobre o mesmo conjunto
de IDs retorna `updated: 0` (FR-008, idempotência), pois todos já estão no status alvo.

## Arquivos

- Modify: `apps/backend/src/user/application/use-case/bulk-change-user-status.usecase.ts`
- Modify: `apps/backend/src/user/application/use-case/bulk-change-user-status.usecase.test.ts`

### Conformidade com as Skills Padrão

- `typescript-advanced`: o tipo de retorno `BulkChangeUserStatusResult` muda de forma (de `{ eligibleIds, skippedCount, requestedCount }` para `{ updated, requested, skipped }`) — precisa ser atualizado de forma consistente na assinatura pública e em todo consumidor futuro (Tasks 04/05).
- `context7`: revisar a documentação do TanStack/Prisma não é necessária aqui, mas vale consultar novamente a assinatura de `CacheDB.deleteByPattern`/`delete` (já usada por `SuspendUserUseCase`) antes de reaproveitá-la, para garantir que a invalidação cobre exatamente os padrões de chave usados pela listagem (`fetch-users:*`) e pelas estatísticas (`user-stats`).
- `vitest`: os testes de idempotência e desbloqueio automático seguem o padrão `describe`/`test` já estabelecido na Task 02, no mesmo arquivo.
- `test-antipatterns`: os testes verificam o estado final persistido no `InMemoryUserRepository` real (via `userOfId`) em vez de espiar chamadas internas ao `updateManyStatus` — evita acoplar o teste aos detalhes de implementação do use case.

## Passos

- **Step 1: Atualizar os testes existentes da Task 02 para o formato de resposta final**

Substituir, em `apps/backend/src/user/application/use-case/bulk-change-user-status.usecase.test.ts`, os dois testes escritos na Task 02 (eles ainda são válidos como comportamento, mas o formato do retorno muda de `eligibleIds`/`skippedCount`/`requestedCount` para `updated`/`requested`/`skipped`):

```ts
	test("exclui usuários inelegíveis da escrita em massa e contabiliza em skipped", async () => {
		await userRepository.save(restoreUser("admin-id", "ADMIN"))
		await userRepository.save(restoreUser("other-admin-id", "ADMIN"))
		await userRepository.save(restoreUser("root-id", "ADMIN", true))
		await userRepository.save(restoreUser("member-id", "MEMBER"))

		const result = await sut.execute({
			requesterId: "admin-id",
			userIds: ["admin-id", "other-admin-id", "root-id", "member-id"],
			targetStatus: "suspended",
		})

		expect(result.isSuccess()).toBe(true)
		if (!result.isSuccess()) return
		expect(result.value.updated).toBe(1)
		expect(result.value.requested).toBe(4)
		expect(result.value.skipped).toBe(3)
		const memberUpdated = await userRepository.userOfId("member-id")
		expect(memberUpdated?.status).toBe("suspended")
		const otherAdminUnchanged = await userRepository.userOfId("other-admin-id")
		expect(otherAdminUnchanged?.status).toBe("activated")
	})

	test("seleção 100% elegível atualiza todos e não gera skipped", async () => {
		await userRepository.save(restoreUser("admin-id", "ADMIN"))
		await userRepository.save(restoreUser("member-1", "MEMBER"))
		await userRepository.save(restoreUser("member-2", "MEMBER"))

		const result = await sut.execute({
			requesterId: "admin-id",
			userIds: ["member-1", "member-2"],
			targetStatus: "activated",
		})

		expect(result.isSuccess()).toBe(true)
		if (!result.isSuccess()) return
		expect(result.value.updated).toBe(2)
		expect(result.value.requested).toBe(2)
		expect(result.value.skipped).toBe(0)
	})
```

- **Step 2: Rodar os testes atualizados para confirmar a falha**

Run: `pnpm --filter backend test:run -- -t "exclui usuários inelegíveis da escrita em massa"`
Expected: FAIL — `result.value.updated` é `undefined` (o use case ainda retorna `eligibleIds`/`skippedCount`/`requestedCount`, não `updated`/`requested`/`skipped`, e nada foi persistido).

- **Step 3: Completar a implementação — escrita, invalidação de cache e resposta agregada**

Substituir o corpo de `apps/backend/src/user/application/use-case/bulk-change-user-status.usecase.ts` (mantendo o construtor):

```ts
import { inject, injectable } from "inversify"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import type { CacheDB } from "@/shared/infra/database/redis/cache-db"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import { UserManagementPolicy } from "@/user/domain/service/user-management-policy"
import type { StatusTypes } from "@/user/domain/value-object/status"
import { NotAllowedToManageUserError } from "../error/not-allowed-to-manage-user-error"
import type { UserRepository } from "../persistence/repository/user-repository"
import { USER_STATS_CACHE_KEY } from "./get-user-stats.usecase"

export interface BulkChangeUserStatusUseCaseInput {
	requesterId: string
	userIds: string[]
	targetStatus: StatusTypes
}

export interface BulkChangeUserStatusResult {
	updated: number
	requested: number
	skipped: number
}

export type BulkChangeUserStatusUseCaseOutput = Promise<
	Either<NotAllowedToManageUserError, BulkChangeUserStatusResult>
>

@injectable()
export class BulkChangeUserStatusUseCase {
	constructor(
		@inject(USER_TYPES.Repositories.User)
		private readonly userRepository: UserRepository,
		@inject(SHARED_TYPES.Redis)
		private readonly cacheDB: CacheDB,
	) {}

	public async execute(
		input: BulkChangeUserStatusUseCaseInput,
	): BulkChangeUserStatusUseCaseOutput {
		const requester = await this.userRepository.userOfId(input.requesterId)
		if (!requester) return failure(new NotAllowedToManageUserError())

		const candidates = await this.userRepository.usersOfIds(input.userIds)
		const eligibleIds = candidates
			.filter((candidate) =>
				UserManagementPolicy.canChangeStatus(requester, candidate),
			)
			.map((candidate) => candidate.id)

		const updated = await this.userRepository.updateManyStatus(
			eligibleIds,
			input.targetStatus,
		)

		void this.cacheDB.deleteByPattern("fetch-users:*").catch(() => {})
		void this.cacheDB.delete(USER_STATS_CACHE_KEY).catch(() => {})

		const requested = input.userIds.length
		return success({ updated, requested, skipped: requested - updated })
	}
}
```

- **Step 4: Rodar os testes para confirmar que passam**

Run: `pnpm --filter backend test:run -- -t "exclui usuários inelegíveis da escrita em massa"`
Expected: PASS

Run: `pnpm --filter backend test:run -- -t "seleção 100% elegível atualiza todos"`
Expected: PASS

- **Step 5: Commit do formato de resposta final**

```bash
git add apps/backend/src/user/application/use-case/bulk-change-user-status.usecase.ts apps/backend/src/user/application/use-case/bulk-change-user-status.usecase.test.ts
git commit -m "feat: completa BulkChangeUserStatusUseCase com escrita agregada e invalidação de cache"
```

- **Step 6: Escrever o teste falho — desbloqueio automático ao ativar em massa (FR-006)**

Adicionar ao mesmo arquivo de teste:

```ts
	test("usuário locked selecionado para ativar em massa termina ativado (desbloqueio automático)", async () => {
		await userRepository.save(restoreUser("admin-id", "ADMIN"))
		const lockedUser = restoreUser("locked-member", "MEMBER")
		lockedUser.lock()
		await userRepository.save(lockedUser)

		const result = await sut.execute({
			requesterId: "admin-id",
			userIds: ["locked-member"],
			targetStatus: "activated",
		})

		expect(result.isSuccess()).toBe(true)
		if (!result.isSuccess()) return
		expect(result.value.updated).toBe(1)
		const updatedUser = await userRepository.userOfId("locked-member")
		expect(updatedUser?.status).toBe("activated")
	})
```

- **Step 7: Rodar o teste para confirmar que passa (comportamento já coberto pelo `where` de `updateManyStatus`)**

Run: `pnpm --filter backend test:run -- -t "usuário locked selecionado para ativar em massa"`
Expected: PASS — nenhuma mudança de implementação necessária; o `where: { status: { not: targetStatus } }` de `updateManyStatus` (Task 01) já captura usuários `locked` quando `targetStatus` é `"activated"`, e `LockedStatus.activate()` (domínio `User`) já transiciona corretamente para `"activated"`.

- **Step 8: Escrever o teste falho — idempotência (FR-008)**

Adicionar ao mesmo arquivo de teste:

```ts
	test("uma segunda chamada idêntica retorna updated: 0 (idempotência)", async () => {
		await userRepository.save(restoreUser("admin-id", "ADMIN"))
		await userRepository.save(restoreUser("member-1", "MEMBER"))

		const firstResult = await sut.execute({
			requesterId: "admin-id",
			userIds: ["member-1"],
			targetStatus: "suspended",
		})
		expect(firstResult.isSuccess()).toBe(true)
		if (!firstResult.isSuccess()) return
		expect(firstResult.value.updated).toBe(1)

		const secondResult = await sut.execute({
			requesterId: "admin-id",
			userIds: ["member-1"],
			targetStatus: "suspended",
		})
		expect(secondResult.isSuccess()).toBe(true)
		if (!secondResult.isSuccess()) return
		expect(secondResult.value.updated).toBe(0)
		expect(secondResult.value.skipped).toBe(1)
	})
```

- **Step 9: Rodar o teste para confirmar que passa**

Run: `pnpm --filter backend test:run -- -t "uma segunda chamada idêntica retorna updated: 0"`
Expected: PASS — já garantido pelo `where: { status: { not: status } }` de `updateManyStatus`, sem lógica adicional no use case.

- **Step 10: Rodar a suíte completa e o type-check**

Run: `pnpm --filter backend test:run`
Expected: PASS (todos os testes do use case, incluindo os 4 cenários desta task)

Run: `pnpm --filter backend tsc:check`
Expected: sem erros de tipo

- **Step 11: Commit final**

```bash
git add apps/backend/src/user/application/use-case/bulk-change-user-status.usecase.test.ts
git commit -m "test: cobre desbloqueio automático e idempotência do BulkChangeUserStatusUseCase"
```

## Critérios de Sucesso

- `BulkChangeUserStatusUseCase.execute()` retorna `success({ updated, requested, skipped })`, onde `skipped = requested - updated` (FR-010) — sem distinguir se o motivo do "skip" foi política ou já-estar-no-status-alvo.
- Um usuário `locked` incluído numa seleção de ativação em massa termina com `status: "activated"` após a chamada, sem branch condicional dedicado no use case (FR-006).
- Chamar `execute()` duas vezes com o mesmo `userIds`/`targetStatus` produz `updated: 0` na segunda chamada (FR-008, idempotência via `where: { status: { not: targetStatus } }`).
- O cache `fetch-users:*` e `user-stats` é invalidado a cada chamada bem-sucedida (mesmo padrão de `SuspendUserUseCase`/`ActiveUserUseCase`), garantindo que a próxima listagem reflita o novo status (FR-007).
- `pnpm --filter backend test:run` e `pnpm --filter backend tsc:check` passam sem erros.
