# Task 10: bulk-change-user-status.usecase.ts publica UserStatusChangedEvent por usuário efetivamente alterado [FR-011]

**Status:** DONE
**PRD:** `../prd/prd-historico-atividade-usuario.md`
**Spec:** `../specs/historico-atividade-usuario-design.md`
**Tier:** capable
**Depends on:** task-01

## Visão Geral

`BulkChangeUserStatusUseCase` altera o status de vários usuários de uma vez através de `userRepository.updateManyStatus(eligibleIds, targetStatus)`, um `UPDATE` em lote via Prisma (`prisma.user.updateMany({ where: { id: { in: ids }, status: { not: status } }, data: { status } })`) que retorna apenas uma contagem (`count`), não os IDs efetivamente alterados. Publicar um `UserStatusChangedEvent` por usuário exige saber quais dos `candidates` tinham `status !== targetStatus` **antes** do update — informação já disponível em memória, pois `candidates` foi buscado antes da chamada em lote. Não é preciso alterar a assinatura de `UserRepository.updateManyStatus` nem iterar registro a registro no banco: o conjunto de usuários efetivamente alterados é computável a partir dos dados já carregados (FR-011).

## Arquivos

- Modify: `apps/backend/src/user/application/use-case/bulk-change-user-status.usecase.ts`
- Test: `apps/backend/src/user/application/use-case/bulk-change-user-status.usecase.test.ts`

### Conformidade com as Skills Padrão

- `no-workarounds`: a solução calcula o conjunto de usuários efetivamente alterados a partir dos `candidates` já buscados (que refletem o status pré-update), em vez de fazer uma segunda query pós-update, iterar N updates individuais, ou assumir "todos os elegíveis mudaram" (o que geraria eventos falsos para quem já estava no status alvo).
- `typescript-advanced`: o payload de `UserStatusChangedEvent` exige `StatusTypes` tanto para `previousStatus` (vindo de `candidate.status`, capturado antes do update em lote) quanto `newStatus` (`input.targetStatus`).
- `test-antipatterns`: o teste novo verifica o número exato de eventos publicados e o payload de cada um usando um subscriber real no `DomainEventPublisher`, sem mockar o publisher nem o repositório além do necessário (o teste já usa `InMemoryUserRepository` real).

## Passos

- **Step 1: Escrever o teste falhando**

Adicionar ao topo de `apps/backend/src/user/application/use-case/bulk-change-user-status.usecase.test.ts` (que já importa `CacheDBMemory`, `InMemoryUserRepository`, `User`, `NotAllowedToManageUserError` e `BulkChangeUserStatusUseCase`; o `beforeEach` instancia `sut` e `userRepository` diretamente, sem container):

```typescript
import type { Subscriber } from "@/shared/domain/event/domain-event-publisher"
import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher"
import { UserStatusChangedEvent } from "@/user/domain/event/user-status-changed.event"
```

E adicionar, dentro do `describe("BulkChangeUserStatusUseCase", ...)`:

```typescript
	test("deve publicar um UserStatusChangedEvent por usuário efetivamente alterado, ignorando quem já está no status alvo", async () => {
		await userRepository.save(restoreUser("admin-id", "ADMIN"))
		await userRepository.save(restoreUser("member-a-id", "MEMBER"))
		await userRepository.save(
			User.restore({
				id: "member-b-id",
				name: "User member-b-id",
				email: "member-b-id@test.com",
				role: "MEMBER",
				status: "suspended",
				createdAt: new Date(),
				isSuperAdmin: false,
			}),
		)

		const receivedEvents: UserStatusChangedEvent[] = []
		const subscriber: Subscriber<unknown> = (event) => {
			if (event instanceof UserStatusChangedEvent) receivedEvents.push(event)
		}
		DomainEventPublisher.instance.subscribe("userStatusChanged", subscriber)

		try {
			const input: BulkChangeUserStatusUseCaseInput = {
				requesterId: "admin-id",
				userIds: ["member-a-id", "member-b-id"],
				targetStatus: "suspended",
			}
			const result = await sut.execute(input)
			expect(result.isSuccess()).toBe(true)
			if (!result.isSuccess()) return
			expect(result.value.updated).toBe(1)
		} finally {
			DomainEventPublisher.instance.unsubscribe(
				"userStatusChanged",
				subscriber,
			)
		}

		expect(receivedEvents).toHaveLength(1)
		expect(receivedEvents[0]).toEqual(
			expect.objectContaining({
				payload: expect.objectContaining({
					userId: "member-a-id",
					previousStatus: "activated",
					newStatus: "suspended",
				}),
			}),
		)
	})
```

- **Step 2: Rodar o teste e confirmar a falha**

Run: `npx vitest --run --config ./test/vite.config.app-domain.ts src/user/application/use-case/bulk-change-user-status.usecase.test.ts` (a partir de `apps/backend/`)
Expected: FAIL — `receivedEvents` permanece vazio (nenhum `UserStatusChangedEvent` é publicado ainda).

- **Step 3: Implementação mínima**

```typescript
// apps/backend/src/user/application/use-case/bulk-change-user-status.usecase.ts
import { inject, injectable } from "inversify"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher"
import type { CacheDB } from "@/shared/infra/database/redis/cache-db"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import { UserManagementPolicy } from "@/user/domain/service/user-management-policy"
import { UserStatusChangedEvent } from "@/user/domain/event/user-status-changed.event"
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

		const uniqueUserIds = Array.from(new Set(input.userIds))
		const candidates = await this.userRepository.usersOfIds(uniqueUserIds)

		const eligibleIds = candidates
			.filter((candidate) =>
				UserManagementPolicy.canChangeStatus(requester, candidate),
			)
			.map((candidate) => candidate.id)

		const changedCandidates = candidates.filter(
			(candidate) =>
				eligibleIds.includes(candidate.id) &&
				candidate.status !== input.targetStatus,
		)

		const updated = await this.userRepository.updateManyStatus(
			eligibleIds,
			input.targetStatus,
		)

		void this.cacheDB.deleteByPattern("fetch-users:*").catch(() => {})
		void this.cacheDB.delete(USER_STATS_CACHE_KEY).catch(() => {})

		await Promise.all(
			changedCandidates.map((candidate) =>
				DomainEventPublisher.instance.publish(
					new UserStatusChangedEvent({
						userId: candidate.id,
						userEmail: candidate.email,
						userName: candidate.name,
						previousStatus: candidate.status,
						newStatus: input.targetStatus,
					}),
				),
			),
		)

		const requested = uniqueUserIds.length
		return success({ updated, requested, skipped: requested - updated })
	}
}
```

- **Step 4: Rodar o teste e confirmar o sucesso**

Run: `npx vitest --run --config ./test/vite.config.app-domain.ts src/user/application/use-case/bulk-change-user-status.usecase.test.ts` (a partir de `apps/backend/`)
Expected: PASS — todos os testes do arquivo, incluindo o novo.

- **Step 5: Commit**

Commit pulado — orquestrador faz commit na barreira de integração da wave; reporte os arquivos alterados (esta task está na Wave 2, execução paralela).

## Critérios de Sucesso

- Uma troca de status em massa publica exatamente um `UserStatusChangedEvent` por usuário cujo status realmente mudou (`status !== targetStatus` antes do update), com `previousStatus` e `newStatus` corretos (FR-011).
- Usuários já no status alvo, ou inelegíveis por política (`UserManagementPolicy.canChangeStatus`), não geram evento.
- `result.value.updated` continua refletindo a contagem real do `updateMany` do Prisma (comportamento pré-existente preservado).
- Todos os testes de `bulk-change-user-status.usecase.test.ts`, incluindo os pré-existentes, passam.
