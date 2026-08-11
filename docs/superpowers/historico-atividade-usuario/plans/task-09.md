# Task 9: active-user.usecase.ts publica UserStatusChangedEvent [FR-011]

**Status:** PENDING
**PRD:** `../prd/prd-historico-atividade-usuario.md`
**Spec:** `../specs/historico-atividade-usuario-design.md`
**Tier:** cheap
**Depends on:** task-01

## Visão Geral

Fazer `ActiveUserUseCase` publicar `UserStatusChangedEvent` no `DomainEventPublisher` sempre que um usuário for ativado com sucesso, espelhando a task 08 (`suspend-user.usecase.ts`) para o sentido inverso (FR-011). O status anterior é capturado antes de `userFound.activate()`, e a publicação é feita diretamente na use case, após `userRepository.update(userFound)` — antes da chamada fire-and-forget `this.loginAttemptStore.deleteLock(...)`.

## Arquivos

- Modify: `apps/backend/src/user/application/use-case/active-user.usecase.ts`
- Test: `apps/backend/src/user/application/use-case/active-user.usecase.test.ts`

### Conformidade com as Skills Padrão

- `typescript-advanced`: o payload de `UserStatusChangedEvent` exige `StatusTypes` tanto para `previousStatus` quanto `newStatus` — capturar `userFound.status` antes de `activate()` garante a tipagem correta sem cast.
- `test-antipatterns`: o teste novo deve observar a publicação real do evento via subscribe/publish/unsubscribe no `DomainEventPublisher`, sem mockar o publisher.

## Passos

- **Step 1: Escrever o teste falhando**

Adicionar ao topo de `apps/backend/src/user/application/use-case/active-user.usecase.test.ts` (que já importa `setupInMemoryRepositories`, `CacheDB`, `InMemoryLoginAttemptStore`, `InMemoryUserRepository`, `container`, `SHARED_TYPES`, `USER_TYPES`, `User`, `StatusTypes`, os erros e `ActiveUserUseCase`; e cujo `beforeEach` já salva um usuário `ROOT_ID` admin/superAdmin):

```typescript
import type { Subscriber } from "@/shared/domain/event/domain-event-publisher"
import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher"
import { UserStatusChangedEvent } from "@/user/domain/event/user-status-changed.event"
```

E adicionar, dentro do `describe("ActiveUserUseCase", ...)`:

```typescript
	test("deve publicar UserStatusChangedEvent ao ativar um usuário", async () => {
		const input: ActiveUserUseCaseInput = {
			requesterId: ROOT_ID,
			userId: "any_user_id",
		}
		const user = (
			await User.create({
				email: "user@email.com",
				name: "any_name",
				password: "any_password",
				id: input.userId,
				status: "suspended",
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
					previousStatus: "suspended",
					newStatus: "activated",
				}),
			}),
		)
	})
```

- **Step 2: Rodar o teste e confirmar a falha**

Run: `npx vitest --run --config ./test/vite.config.app-domain.ts src/user/application/use-case/active-user.usecase.test.ts` (a partir de `apps/backend/`)
Expected: FAIL — `receivedEvent` permanece `null` (nenhum `UserStatusChangedEvent` é publicado ainda).

- **Step 3: Implementação mínima**

```typescript
// apps/backend/src/user/application/use-case/active-user.usecase.ts
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
import type { LoginAttemptStore } from "../persistence/login-attempt-store"
import type { UserRepository } from "../persistence/repository/user-repository"
import { USER_STATS_CACHE_KEY } from "./get-user-stats.usecase"

export interface ActiveUserUseCaseInput {
	requesterId: string
	userId: string
}

export type ActiveUserUseCaseOutput = Promise<
	Either<UserNotFoundError | NotAllowedToManageUserError, null>
>

@injectable()
export class ActiveUserUseCase {
	constructor(
		@inject(USER_TYPES.Repositories.User)
		private readonly userRepository: UserRepository,
		@inject(SHARED_TYPES.Redis)
		private readonly cacheDB: CacheDB,
		@inject(USER_TYPES.Gateways.LoginAttemptStore)
		private readonly loginAttemptStore: LoginAttemptStore,
	) {}

	public async execute(input: ActiveUserUseCaseInput): ActiveUserUseCaseOutput {
		const requester = await this.userRepository.userOfId(input.requesterId)
		if (!requester) return failure(new NotAllowedToManageUserError())

		const userFound = await this.userRepository.userOfId(input.userId)
		if (!userFound) return failure(new UserNotFoundError())

		if (!UserManagementPolicy.canChangeStatus(requester, userFound)) {
			return failure(new NotAllowedToManageUserError())
		}

		const previousStatus = userFound.status
		userFound.activate()
		await this.userRepository.update(userFound)
		void this.cacheDB.deleteByPattern("fetch-users:*").catch(() => {})
		void this.cacheDB.delete(USER_STATS_CACHE_KEY).catch(() => {})
		await DomainEventPublisher.instance.publish(
			new UserStatusChangedEvent({
				userId: userFound.id,
				userEmail: userFound.email,
				userName: userFound.name,
				previousStatus,
				newStatus: "activated",
			}),
		)
		this.loginAttemptStore.deleteLock(userFound.id).catch((err) => {
			console.error("[ActiveUserUseCase] Falha ao limpar Redis lock:", err)
		})
		return success(null)
	}
}
```

- **Step 4: Rodar o teste e confirmar o sucesso**

Run: `npx vitest --run --config ./test/vite.config.app-domain.ts src/user/application/use-case/active-user.usecase.test.ts` (a partir de `apps/backend/`)
Expected: PASS — todos os testes do arquivo, incluindo o novo.

- **Step 5: Commit**

Commit pulado — orquestrador faz commit na barreira de integração da wave; reporte os arquivos alterados (esta task está na Wave 2, execução paralela).

## Critérios de Sucesso

- Ativar um usuário via `ActiveUserUseCase.execute()` com sucesso publica exatamente um `UserStatusChangedEvent` com `previousStatus: "suspended"` e `newStatus: "activated"` (FR-011).
- Tentativas que falham (sem permissão, usuário inexistente) não publicam o evento.
- Todos os testes de `active-user.usecase.test.ts`, incluindo os pré-existentes (inclusive o de limpeza do Redis lock para conta bloqueada), passam.
