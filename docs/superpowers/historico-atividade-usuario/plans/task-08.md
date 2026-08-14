# Task 8: suspend-user.usecase.ts publica UserStatusChangedEvent [FR-011]

**Status:** DONE
**PRD:** `../prd/prd-historico-atividade-usuario.md`
**Spec:** `../specs/historico-atividade-usuario-design.md`
**Tier:** cheap
**Depends on:** task-01

## Visão Geral

Fazer `SuspendUserUseCase` publicar `UserStatusChangedEvent` no `DomainEventPublisher` sempre que um usuário for suspenso com sucesso, para que `RecordUserActivitySubscriber` (task 12) grave o evento de atividade "status alterado" (FR-011). `userFound.suspend()` delega a `this._status.suspend()` e não dispara evento algum — o status anterior precisa ser capturado antes da chamada, e a publicação é feita diretamente na use case, após `userRepository.update(userFound)`.

## Arquivos

- Modify: `apps/backend/src/user/application/use-case/suspend-user.usecase.ts`
- Test: `apps/backend/src/user/application/use-case/suspend-user.usecase.test.ts`

### Conformidade com as Skills Padrão

- `typescript-advanced`: o payload de `UserStatusChangedEvent` exige `StatusTypes` tanto para `previousStatus` quanto `newStatus` — capturar `userFound.status` antes de `suspend()` garante a tipagem correta sem cast.
- `test-antipatterns`: o teste novo deve observar a publicação real do evento via subscribe/publish/unsubscribe no `DomainEventPublisher`, sem mockar o publisher.

## Passos

- **Step 1: Escrever o teste falhando**

Adicionar ao topo de `apps/backend/src/user/application/use-case/suspend-user.usecase.test.ts` (que já importa `setupInMemoryRepositories`, `CacheDB`, `InMemoryUserRepository`, `container`, `SHARED_TYPES`, `USER_TYPES`, `User`, os erros e `SuspendUserUseCase`; e cujo `beforeEach` já salva um usuário `ROOT_ID` admin/superAdmin):

```typescript
import type { Subscriber } from "@/shared/domain/event/domain-event-publisher"
import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher"
import { UserStatusChangedEvent } from "@/user/domain/event/user-status-changed.event"
```

E adicionar, dentro do `describe("SuspendUserUseCase", ...)`:

```typescript
	test("deve publicar UserStatusChangedEvent ao suspender um usuário", async () => {
		const input: SuspendUserUseCaseInput = {
			requesterId: ROOT_ID,
			userId: "any_user_id",
		}
		const user = (
			await User.create({
				email: "user@email.com",
				name: "any_name",
				password: "any_password",
				id: input.userId,
			})
		).forceSuccess().value
		await userRepository.save(user)

		let receivedEvent: UserStatusChangedEvent | null = null
		const subscriber: Subscriber<unknown> = (event) => {
			if (event instanceof UserStatusChangedEvent) receivedEvent = event
		}
		DomainEventPublisher.instance.subscribe("userStatusChanged", subscriber)

		try {
			await sut.execute(input)
		} finally {
			DomainEventPublisher.instance.unsubscribe(
				"userStatusChanged",
				subscriber,
			)
		}

		expect(receivedEvent).not.toBeNull()
		expect(receivedEvent).toEqual(
			expect.objectContaining({
				payload: expect.objectContaining({
					userId: input.userId,
					previousStatus: "activated",
					newStatus: "suspended",
				}),
			}),
		)
	})
```

- **Step 2: Rodar o teste e confirmar a falha**

Run: `npx vitest --run --config ./test/vite.config.app-domain.ts src/user/application/use-case/suspend-user.usecase.test.ts` (a partir de `apps/backend/`)
Expected: FAIL — `receivedEvent` permanece `null` (nenhum `UserStatusChangedEvent` é publicado ainda).

- **Step 3: Implementação mínima**

```typescript
// apps/backend/src/user/application/use-case/suspend-user.usecase.ts
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
import { NotAllowedToManageUserError } from "../error/not-allowed-to-manage-user-error"
import { UserNotFoundError } from "../error/user-not-found-error"
import type { UserRepository } from "../persistence/repository/user-repository"
import { USER_STATS_CACHE_KEY } from "./get-user-stats.usecase"

export interface SuspendUserUseCaseInput {
	requesterId: string
	userId: string
}

export type SuspendUserUseCaseOutput = Promise<
	Either<UserNotFoundError | NotAllowedToManageUserError, null>
>

@injectable()
export class SuspendUserUseCase {
	constructor(
		@inject(USER_TYPES.Repositories.User)
		private readonly userRepository: UserRepository,
		@inject(SHARED_TYPES.Redis)
		private readonly cacheDB: CacheDB,
	) {}

	public async execute(
		input: SuspendUserUseCaseInput,
	): SuspendUserUseCaseOutput {
		const requester = await this.userRepository.userOfId(input.requesterId)
		if (!requester) return failure(new NotAllowedToManageUserError())

		const userFound = await this.userRepository.userOfId(input.userId)
		if (!userFound) return failure(new UserNotFoundError())

		if (!UserManagementPolicy.canChangeStatus(requester, userFound)) {
			return failure(new NotAllowedToManageUserError())
		}

		const previousStatus = userFound.status
		userFound.suspend()
		await this.userRepository.update(userFound)
		void this.cacheDB.deleteByPattern("fetch-users:*").catch(() => {})
		void this.cacheDB.delete(USER_STATS_CACHE_KEY).catch(() => {})
		await DomainEventPublisher.instance.publish(
			new UserStatusChangedEvent({
				userId: userFound.id,
				userEmail: userFound.email,
				userName: userFound.name,
				previousStatus,
				newStatus: "suspended",
			}),
		)
		return success(null)
	}
}
```

- **Step 4: Rodar o teste e confirmar o sucesso**

Run: `npx vitest --run --config ./test/vite.config.app-domain.ts src/user/application/use-case/suspend-user.usecase.test.ts` (a partir de `apps/backend/`)
Expected: PASS — todos os testes do arquivo, incluindo o novo.

- **Step 5: Commit**

Commit pulado — orquestrador faz commit na barreira de integração da wave; reporte os arquivos alterados (esta task está na Wave 2, execução paralela).

## Critérios de Sucesso

- Suspender um usuário via `SuspendUserUseCase.execute()` com sucesso publica exatamente um `UserStatusChangedEvent` com `previousStatus: "activated"` e `newStatus: "suspended"` (FR-011).
- Tentativas que falham (sem permissão, usuário inexistente) não publicam o evento.
- Todos os testes de `suspend-user.usecase.test.ts`, incluindo os pré-existentes, passam.
