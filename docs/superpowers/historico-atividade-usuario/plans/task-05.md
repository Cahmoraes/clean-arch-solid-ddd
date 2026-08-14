# Task 5: update-user-profile.usecase.ts religa UserProfileUpdatedEvent [FR-009]

**Status:** DONE
**PRD:** `../prd/prd-historico-atividade-usuario.md`
**Spec:** `../specs/historico-atividade-usuario-design.md`
**Tier:** cheap
**Depends on:** task-04

## Visão Geral

`UpdateUserProfileUseCase` é o fluxo de admin editando o perfil de outro usuário. Assim como `UpdateMyProfileUseCase` (task 04), ele chama `user.updateProfile(...)`, que já dispara `UserProfileUpdatedEvent` internamente via `this.notify(...)` — mas esse evento é órfão até alguém religá-lo com `user.subscribe(...)`. Esta task aplica exatamente a mesma mecânica de religamento da task 04, mas em `UpdateUserProfileUseCase`. **Depende da task 04**: é a task 04 que adiciona `userId` ao payload de `UserProfileUpdatedEvent` e ao `notify()` dentro de `User.updateProfile()` — sem essa alteração já integrada, o teste desta task (que verifica `payload.userId`) não teria como passar. Nenhuma alteração adicional na entidade `User` ou no arquivo do evento é necessária aqui além da já feita pela task 04.

## Arquivos

- Modify: `apps/backend/src/user/application/use-case/update-user-profile.usecase.ts`
- Test: `apps/backend/src/user/application/use-case/update-user-profile.usecase.test.ts`

### Conformidade com as Skills Padrão

- `test-antipatterns`: o teste novo deve observar a publicação real do evento via subscribe/publish/unsubscribe no `DomainEventPublisher`, sem mockar o publisher.
- `no-workarounds`: reaproveitar o mecanismo de religamento já estabelecido (subscribe + publish) em vez de publicar o evento manualmente na use case, o que duplicaria a responsabilidade que já pertence à entidade `User`.

## Passos

- **Step 1: Escrever o teste falhando**

Adicionar ao topo de `apps/backend/src/user/application/use-case/update-user-profile.usecase.test.ts` (que já importa `createAndSaveUser`, `setupInMemoryRepositories`, `container`, `InMemoryUserRepository`, `InvalidEmailError`, `InvalidNameLengthError`, `User`, `NotAllowedToManageUserError`):

```typescript
import type { Subscriber } from "@/shared/domain/event/domain-event-publisher"
import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher"
import { UserProfileUpdatedEvent } from "@/user/domain/event/user-profile-updated-event"
```

E adicionar, dentro do `describe("UpdateUserProfile", ...)`:

```typescript
	test("deve publicar UserProfileUpdatedEvent ao atualizar o perfil de outro usuário com sucesso", async () => {
		const requesterId = "requester-admin-id"
		const userId = "any_user_id"
		await userRepository.save(User.restore({ id: requesterId, ...adminProps }))
		await createAndSaveUser({
			userRepository,
			name: "john doe",
			email: "john@doe.com",
			password: "any_password",
			id: userId,
		})

		let receivedEvent: UserProfileUpdatedEvent | null = null
		const subscriber: Subscriber<unknown> = (event) => {
			if (event instanceof UserProfileUpdatedEvent) receivedEvent = event
		}
		DomainEventPublisher.instance.subscribe("userProfileUpdated", subscriber)

		try {
			await sut.execute({
				requesterId,
				userId,
				name: "Martin Fowler",
				email: "martin@fowler.com",
			})
		} finally {
			DomainEventPublisher.instance.unsubscribe(
				"userProfileUpdated",
				subscriber,
			)
		}

		expect(receivedEvent).not.toBeNull()
		expect(receivedEvent).toEqual(
			expect.objectContaining({
				payload: expect.objectContaining({
					userId,
					name: "Martin Fowler",
					email: "martin@fowler.com",
				}),
			}),
		)
	})
```

- **Step 2: Rodar o teste e confirmar a falha**

Run: `npx vitest --run --config ./test/vite.config.app-domain.ts src/user/application/use-case/update-user-profile.usecase.test.ts` (a partir de `apps/backend/`)
Expected: FAIL — `receivedEvent` permanece `null` (nenhum `UserProfileUpdatedEvent` é publicado no `DomainEventPublisher` global ainda).

- **Step 3: Implementação mínima**

```typescript
// apps/backend/src/user/application/use-case/update-user-profile.usecase.ts
import { inject, injectable } from "inversify"
import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher"
import { type Either, failure, success } from "@/shared/domain/value-object/either"
import { USER_TYPES } from "@/shared/infra/ioc/types"
import { UserManagementPolicy } from "@/user/domain/service/user-management-policy"
import type { UserProfileUpdatedEvent } from "@/user/domain/event/user-profile-updated-event"
import type { User, UserValidationErrors } from "@/user/domain/user"
import { NotAllowedToManageUserError } from "../error/not-allowed-to-manage-user-error"
import { UserNotFoundError } from "../error/user-not-found-error"
import type { UserRepository } from "../persistence/repository/user-repository"

export interface UpdateUserProfileUseCaseInput {
	requesterId: string
	userId: string
	name: string
	email: string
}
export type UpdateUserProfileUseCaseOutput = Either<
	UserValidationErrors[] | UserValidationErrors | UserNotFoundError | NotAllowedToManageUserError,
	User
>

@injectable()
export class UpdateUserProfileUseCase {
	constructor(
		@inject(USER_TYPES.Repositories.User)
		private readonly userRepository: UserRepository,
	) {
		this.bindMethod()
	}

	private bindMethod(): void {
		this.handleUserProfileUpdatedEvent =
			this.handleUserProfileUpdatedEvent.bind(this)
	}

	public async execute(
		input: UpdateUserProfileUseCaseInput,
	): Promise<UpdateUserProfileUseCaseOutput> {
		const requester = await this.userRepository.userOfId(input.requesterId)
		if (!requester) return failure(new NotAllowedToManageUserError())
		const user = await this.userRepository.userOfId(input.userId)
		if (!user) return failure(new UserNotFoundError())
		if (!UserManagementPolicy.canEditProfile(requester, user)) {
			return failure(new NotAllowedToManageUserError())
		}
		user.subscribe(this.handleUserProfileUpdatedEvent)
		const profileUpdateResult = user.updateProfile({
			name: input.name,
			email: input.email,
		})
		if (profileUpdateResult.isFailure()) return failure(profileUpdateResult.value)
		await this.userRepository.update(user)
		return success(user)
	}

	private handleUserProfileUpdatedEvent(data: UserProfileUpdatedEvent): void {
		void DomainEventPublisher.instance.publish(data)
	}
}
```

- **Step 4: Rodar o teste e confirmar o sucesso**

Run: `npx vitest --run --config ./test/vite.config.app-domain.ts src/user/application/use-case/update-user-profile.usecase.test.ts` (a partir de `apps/backend/`)
Expected: PASS — todos os testes do arquivo, incluindo o novo.

- **Step 5: Commit**

Commit pulado — orquestrador faz commit na barreira de integração da wave; reporte os arquivos alterados (esta task está na Wave 2, execução paralela).

## Critérios de Sucesso

- Um admin atualizando o perfil de outro usuário via `UpdateUserProfileUseCase.execute()` com sucesso publica exatamente um `UserProfileUpdatedEvent` com `userId`, `name` e `email` do usuário alvo (FR-009).
- Tentativas que falham (requester/usuário inexistente, sem permissão, nome/email inválido) não publicam o evento.
- Todos os testes de `update-user-profile.usecase.test.ts`, incluindo os pré-existentes, passam.
