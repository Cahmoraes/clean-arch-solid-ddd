# Task 7: demote-from-admin.usecase.ts publica UserRoleChangedEvent [FR-010]

**Status:** DONE
**PRD:** `../prd/prd-historico-atividade-usuario.md`
**Spec:** `../specs/historico-atividade-usuario-design.md`
**Tier:** cheap
**Depends on:** task-01

## Visão Geral

Fazer `DemoteFromAdminUseCase` publicar `UserRoleChangedEvent` no `DomainEventPublisher` sempre que um administrador for rebaixado a membro com sucesso, espelhando a task 06 (`promote-to-admin.usecase.ts`) para o sentido inverso (FR-010). O role anterior é capturado antes de `user.updateRole("MEMBER")`, e a publicação é feita diretamente na use case, após `userRepository.update(user)`.

## Arquivos

- Modify: `apps/backend/src/user/application/use-case/demote-from-admin.usecase.ts`
- Test: `apps/backend/src/user/application/use-case/demote-from-admin.usecase.test.ts`

### Conformidade com as Skills Padrão

- `typescript-advanced`: o payload de `UserRoleChangedEvent` exige `RoleTypes` tanto para `previousRole` quanto `newRole` — capturar `user.role` antes de `updateRole()` garante a tipagem correta sem cast.
- `test-antipatterns`: o teste novo deve observar a publicação real do evento via subscribe/publish/unsubscribe no `DomainEventPublisher`, sem mockar o publisher.

## Passos

- **Step 1: Escrever o teste falhando**

Adicionar ao topo de `apps/backend/src/user/application/use-case/demote-from-admin.usecase.test.ts` (que já importa `setupInMemoryRepositories`, `CacheDB`, `InMemoryUserRepository`, `container`, `SHARED_TYPES`, `USER_TYPES`, `User`, os erros e `DemoteFromAdminUseCase`):

```typescript
import type { Subscriber } from "@/shared/domain/event/domain-event-publisher"
import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher"
import { UserRoleChangedEvent } from "@/user/domain/event/user-role-changed.event"
```

E adicionar, dentro do `describe("DemoteFromAdminUseCase", ...)`:

```typescript
	test("deve publicar UserRoleChangedEvent ao rebaixar um administrador a membro", async () => {
		await userRepository.save(makeRoot())
		const user = (
			await User.create({
				id: "admin-id",
				email: "admin@test.com",
				name: "Admin User",
				password: "password",
				role: "ADMIN",
			})
		).forceSuccess().value
		await userRepository.save(user)

		let receivedEvent: UserRoleChangedEvent | null = null
		const subscriber: Subscriber<unknown> = (event) => {
			if (event instanceof UserRoleChangedEvent) receivedEvent = event
		}
		DomainEventPublisher.instance.subscribe("userRoleChanged", subscriber)

		try {
			await sut.execute({ requesterId: "root-id", userId: "admin-id" })
		} finally {
			DomainEventPublisher.instance.unsubscribe("userRoleChanged", subscriber)
		}

		expect(receivedEvent).not.toBeNull()
		expect(receivedEvent).toEqual(
			expect.objectContaining({
				payload: expect.objectContaining({
					userId: "admin-id",
					previousRole: "ADMIN",
					newRole: "MEMBER",
				}),
			}),
		)
	})
```

- **Step 2: Rodar o teste e confirmar a falha**

Run: `npx vitest --run --config ./test/vite.config.app-domain.ts src/user/application/use-case/demote-from-admin.usecase.test.ts` (a partir de `apps/backend/`)
Expected: FAIL — `receivedEvent` permanece `null` (nenhum `UserRoleChangedEvent` é publicado ainda).

- **Step 3: Implementação mínima**

```typescript
// apps/backend/src/user/application/use-case/demote-from-admin.usecase.ts
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
import { UserRoleChangedEvent } from "@/user/domain/event/user-role-changed.event"
import type { User } from "@/user/domain/user"
import { CannotDemoteSelfError } from "../error/cannot-demote-self-error"
import { NotAllowedToManageUserError } from "../error/not-allowed-to-manage-user-error"
import { UserIsNotAdminError } from "../error/user-is-not-admin-error"
import { UserIsSuperAdminError } from "../error/user-is-super-admin-error"
import { UserNotFoundError } from "../error/user-not-found-error"
import type { UserRepository } from "../persistence/repository/user-repository"
import { USER_STATS_CACHE_KEY } from "./get-user-stats.usecase"

export interface DemoteFromAdminUseCaseInput {
	userId: string
	requesterId: string
}

export type DemoteFromAdminUseCaseOutput = Promise<
	Either<
		| UserNotFoundError
		| UserIsNotAdminError
		| UserIsSuperAdminError
		| CannotDemoteSelfError
		| NotAllowedToManageUserError,
		null
	>
>

type AuthorizeResult = Either<
	NotAllowedToManageUserError | UserNotFoundError | UserIsSuperAdminError,
	{ requester: User; user: User }
>

@injectable()
export class DemoteFromAdminUseCase {
	constructor(
		@inject(USER_TYPES.Repositories.User)
		private readonly userRepository: UserRepository,
		@inject(SHARED_TYPES.Redis)
		private readonly cacheDB: CacheDB,
	) {}

	private async authorizeRoleChange(
		requesterId: string,
		userId: string,
	): Promise<AuthorizeResult> {
		const requester = await this.userRepository.userOfId(requesterId)
		if (!requester) return failure(new NotAllowedToManageUserError())
		const user = await this.userRepository.userOfId(userId)
		if (!user) return failure(new UserNotFoundError())
		if (user.isSuperAdmin) return failure(new UserIsSuperAdminError())
		if (!UserManagementPolicy.canChangeRole(requester, user)) {
			return failure(new NotAllowedToManageUserError())
		}
		return success({ requester, user })
	}

	public async execute(
		input: DemoteFromAdminUseCaseInput,
	): DemoteFromAdminUseCaseOutput {
		if (input.userId === input.requesterId) {
			return failure(new CannotDemoteSelfError())
		}

		const authResult = await this.authorizeRoleChange(
			input.requesterId,
			input.userId,
		)
		if (authResult.isFailure()) return failure(authResult.value)

		const { user } = authResult.value
		if (user.role !== "ADMIN") return failure(new UserIsNotAdminError())
		const previousRole = user.role
		user.updateRole("MEMBER")
		await this.userRepository.update(user)
		void this.cacheDB.deleteByPattern("fetch-users:*").catch(() => {})
		void this.cacheDB.delete(USER_STATS_CACHE_KEY).catch(() => {})
		await DomainEventPublisher.instance.publish(
			new UserRoleChangedEvent({
				userId: user.id,
				userEmail: user.email,
				userName: user.name,
				previousRole,
				newRole: "MEMBER",
			}),
		)
		return success(null)
	}
}
```

- **Step 4: Rodar o teste e confirmar o sucesso**

Run: `npx vitest --run --config ./test/vite.config.app-domain.ts src/user/application/use-case/demote-from-admin.usecase.test.ts` (a partir de `apps/backend/`)
Expected: PASS — todos os testes do arquivo, incluindo o novo.

- **Step 5: Commit**

Commit pulado — orquestrador faz commit na barreira de integração da wave; reporte os arquivos alterados (esta task está na Wave 2, execução paralela).

## Critérios de Sucesso

- Rebaixar um admin a membro via `DemoteFromAdminUseCase.execute()` com sucesso publica exatamente um `UserRoleChangedEvent` com `previousRole: "ADMIN"` e `newRole: "MEMBER"` (FR-010).
- Tentativas que falham (auto-rebaixamento, não é admin, sem permissão, super admin, usuário inexistente) não publicam o evento.
- Todos os testes de `demote-from-admin.usecase.test.ts`, incluindo os pré-existentes, passam.
