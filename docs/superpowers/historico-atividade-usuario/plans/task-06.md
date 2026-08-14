# Task 6: promote-to-admin.usecase.ts publica UserRoleChangedEvent [FR-010]

**Status:** DONE
**PRD:** `../prd/prd-historico-atividade-usuario.md`
**Spec:** `../specs/historico-atividade-usuario-design.md`
**Tier:** cheap
**Depends on:** task-01

## Visão Geral

Fazer `PromoteToAdminUseCase` publicar `UserRoleChangedEvent` no `DomainEventPublisher` sempre que um membro for promovido a administrador com sucesso, para que `RecordUserActivitySubscriber` (task 12) grave o evento de atividade "role alterada" (FR-010). `User.updateRole(role)` não retorna o role anterior nem dispara evento algum — o role anterior precisa ser capturado antes da chamada, e a publicação é feita diretamente na use case (mesmo padrão de `AccountLockedBySecurityEvent` em `authenticate.usecase.ts`, não via `user.subscribe(...)`).

## Arquivos

- Modify: `apps/backend/src/user/application/use-case/promote-to-admin.usecase.ts`
- Test: `apps/backend/src/user/application/use-case/promote-to-admin.usecase.test.ts`

### Conformidade com as Skills Padrão

- `typescript-advanced`: o payload de `UserRoleChangedEvent` exige `RoleTypes` tanto para `previousRole` quanto `newRole` — capturar o valor de `user.role` antes de `updateRole()` garante a tipagem correta sem cast.
- `test-antipatterns`: o teste novo deve observar a publicação real do evento via subscribe/publish/unsubscribe no `DomainEventPublisher`, sem mockar o publisher.

## Passos

- **Step 1: Escrever o teste falhando**

Adicionar ao topo de `apps/backend/src/user/application/use-case/promote-to-admin.usecase.test.ts` (que já importa `setupInMemoryRepositories`, `CacheDB`, `InMemoryUserRepository`, `container`, `SHARED_TYPES`, `USER_TYPES`, `User`, os erros e `PromoteToAdminUseCase`):

```typescript
import type { Subscriber } from "@/shared/domain/event/domain-event-publisher"
import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher"
import { UserRoleChangedEvent } from "@/user/domain/event/user-role-changed.event"
```

E adicionar, dentro do `describe("PromoteToAdminUseCase", ...)`:

```typescript
	test("deve publicar UserRoleChangedEvent ao promover um membro a administrador", async () => {
		await userRepository.save(makeRoot())
		const user = (
			await User.create({
				id: "member-id",
				email: "member@test.com",
				name: "Member",
				password: "password",
				role: "MEMBER",
			})
		).forceSuccess().value
		await userRepository.save(user)

		let receivedEvent: UserRoleChangedEvent | null = null
		const subscriber: Subscriber<unknown> = (event) => {
			if (event instanceof UserRoleChangedEvent) receivedEvent = event
		}
		DomainEventPublisher.instance.subscribe("userRoleChanged", subscriber)

		try {
			await sut.execute({ requesterId: "root-id", userId: "member-id" })
		} finally {
			DomainEventPublisher.instance.unsubscribe("userRoleChanged", subscriber)
		}

		expect(receivedEvent).not.toBeNull()
		expect(receivedEvent).toEqual(
			expect.objectContaining({
				payload: expect.objectContaining({
					userId: "member-id",
					previousRole: "MEMBER",
					newRole: "ADMIN",
				}),
			}),
		)
	})
```

- **Step 2: Rodar o teste e confirmar a falha**

Run: `npx vitest --run --config ./test/vite.config.app-domain.ts src/user/application/use-case/promote-to-admin.usecase.test.ts` (a partir de `apps/backend/`)
Expected: FAIL — `receivedEvent` permanece `null` (nenhum `UserRoleChangedEvent` é publicado ainda).

- **Step 3: Implementação mínima**

```typescript
// apps/backend/src/user/application/use-case/promote-to-admin.usecase.ts
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
import { NotAllowedToManageUserError } from "../error/not-allowed-to-manage-user-error"
import { UserAlreadyAdminError } from "../error/user-already-admin-error"
import { UserIsNotActiveError } from "../error/user-is-not-active-error"
import { UserIsSuperAdminError } from "../error/user-is-super-admin-error"
import { UserNotFoundError } from "../error/user-not-found-error"
import type { UserRepository } from "../persistence/repository/user-repository"
import { USER_STATS_CACHE_KEY } from "./get-user-stats.usecase"

export interface PromoteToAdminUseCaseInput {
	requesterId: string
	userId: string
}

export type PromoteToAdminUseCaseOutput = Promise<
	Either<
		| UserNotFoundError
		| UserAlreadyAdminError
		| UserIsNotActiveError
		| UserIsSuperAdminError
		| NotAllowedToManageUserError,
		null
	>
>

type AuthorizeResult = Either<
	NotAllowedToManageUserError | UserNotFoundError | UserIsSuperAdminError,
	{ requester: User; user: User }
>

@injectable()
export class PromoteToAdminUseCase {
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
		input: PromoteToAdminUseCaseInput,
	): PromoteToAdminUseCaseOutput {
		const authResult = await this.authorizeRoleChange(
			input.requesterId,
			input.userId,
		)
		if (authResult.isFailure()) return failure(authResult.value)

		const { user } = authResult.value
		if (!user.isActive) return failure(new UserIsNotActiveError())
		if (user.role === "ADMIN") return failure(new UserAlreadyAdminError())

		const previousRole = user.role
		user.updateRole("ADMIN")
		await this.userRepository.update(user)
		void this.cacheDB.deleteByPattern("fetch-users:*").catch(() => {})
		void this.cacheDB.delete(USER_STATS_CACHE_KEY).catch(() => {})
		await DomainEventPublisher.instance.publish(
			new UserRoleChangedEvent({
				userId: user.id,
				userEmail: user.email,
				userName: user.name,
				previousRole,
				newRole: "ADMIN",
			}),
		)
		return success(null)
	}
}
```

- **Step 4: Rodar o teste e confirmar o sucesso**

Run: `npx vitest --run --config ./test/vite.config.app-domain.ts src/user/application/use-case/promote-to-admin.usecase.test.ts` (a partir de `apps/backend/`)
Expected: PASS — todos os testes do arquivo, incluindo o novo.

- **Step 5: Commit**

Commit pulado — orquestrador faz commit na barreira de integração da wave; reporte os arquivos alterados (esta task está na Wave 2, execução paralela).

## Critérios de Sucesso

- Promover um membro a admin via `PromoteToAdminUseCase.execute()` com sucesso publica exatamente um `UserRoleChangedEvent` com `previousRole: "MEMBER"` e `newRole: "ADMIN"` (FR-010).
- Tentativas que falham (já é admin, não está ativo, sem permissão, super admin, usuário inexistente) não publicam o evento.
- Todos os testes de `promote-to-admin.usecase.test.ts`, incluindo os pré-existentes, passam.
