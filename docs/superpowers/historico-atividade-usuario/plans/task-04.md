# Task 4: update-my-profile.usecase.ts religa UserProfileUpdatedEvent [FR-009]

**Status:** DONE
**PRD:** `../prd/prd-historico-atividade-usuario.md`
**Spec:** `../specs/historico-atividade-usuario-design.md`
**Tier:** cheap
**Depends on:** N/A

## Visão Geral

`User.updateProfile()` já dispara `UserProfileUpdatedEvent` internamente via `this.notify(...)`, mas hoje é órfão — nenhum listener republica esse evento no `DomainEventPublisher` global. Esta task religa o evento em `UpdateMyProfileUseCase` (usado quando o próprio usuário edita seu nome), seguindo exatamente o padrão `user.subscribe(...)` já usado em `change-password.usecase.ts` (FR-009).

`UserProfileUpdatedEventProps` hoje é `{ name: string; email: string }` e não inclui `userId`, necessário para `RecordUserActivitySubscriber` (task 12) saber de qual usuário é o evento. Esta task adiciona `userId` ao payload, alterando tanto a interface do evento quanto o único lugar que o constrói: `User.updateProfile()` em `apps/backend/src/user/domain/user.ts`. A task 05 (`update-user-profile.usecase.ts`, o fluxo de admin editando outro usuário) usa a mesma entidade e o mesmo evento — como a alteração do payload é feita nesta task, a task 05 não precisa tocar no arquivo do evento nem em `user.ts` novamente.

## Arquivos

- Modify: `apps/backend/src/user/application/use-case/update-my-profile.usecase.ts`
- Modify: `apps/backend/src/user/domain/event/user-profile-updated-event.ts`
- Modify: `apps/backend/src/user/domain/user.ts`
- Test: `apps/backend/src/user/application/use-case/update-my-profile.usecase.test.ts`

### Conformidade com as Skills Padrão

- `typescript-advanced`: extensão da interface `UserProfileUpdatedEventProps` com um campo obrigatório novo (`userId`) — o único call site (`User.updateProfile`) precisa ser atualizado para a tipagem continuar válida.
- `no-workarounds`: adicionar `userId` deve ser feito na raiz (interface + único construtor do evento), nunca com um valor vazio só para satisfazer o compilador.
- `test-antipatterns`: o teste novo deve observar a publicação real do evento via subscribe/publish/unsubscribe no `DomainEventPublisher`, sem mockar o publisher.

## Passos

- **Step 1: Escrever o teste falhando**

Adicionar ao topo de `apps/backend/src/user/application/use-case/update-my-profile.usecase.test.ts` (que já importa `createAndSaveUser`, `setupInMemoryRepositories`, `container`, `InMemoryUserRepository`, `UserNotFoundError`):

```typescript
import type { Subscriber } from "@/shared/domain/event/domain-event-publisher"
import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher"
import { UserProfileUpdatedEvent } from "@/user/domain/event/user-profile-updated-event"
```

E adicionar, dentro do `describe("UpdateMyProfileUseCase", ...)`:

```typescript
	test("deve publicar UserProfileUpdatedEvent ao atualizar o perfil com sucesso", async () => {
		const user = await createAndSaveUser({
			userRepository,
			name: "João Silva",
			email: "joao@example.com",
			password: "Senha123!",
		})

		let receivedEvent: UserProfileUpdatedEvent | null = null
		const subscriber: Subscriber<unknown> = (event) => {
			if (event instanceof UserProfileUpdatedEvent) receivedEvent = event
		}
		DomainEventPublisher.instance.subscribe("userProfileUpdated", subscriber)

		try {
			await sut.execute({ userId: user.id, name: "João Carlos Silva" })
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
					userId: user.id,
					name: "João Carlos Silva",
				}),
			}),
		)
	})
```

- **Step 2: Rodar o teste e confirmar a falha**

Run: `npx vitest --run --config ./test/vite.config.app-domain.ts src/user/application/use-case/update-my-profile.usecase.test.ts` (a partir de `apps/backend/`)
Expected: FAIL — `receivedEvent` permanece `null` (nenhum `UserProfileUpdatedEvent` é publicado no `DomainEventPublisher` global ainda).

- **Step 3: Implementação mínima**

Em `apps/backend/src/user/domain/event/user-profile-updated-event.ts`, adicionar `userId`:

```typescript
import { DomainEvent } from "@/shared/domain/event/domain-event"
import { EVENTS } from "@/shared/domain/event/events"

export interface UserProfileUpdatedEventProps {
	userId: string
	name: string
	email: string
}

export class UserProfileUpdatedEvent extends DomainEvent<UserProfileUpdatedEventProps> {
	readonly payload: UserProfileUpdatedEventProps

	constructor(props: UserProfileUpdatedEventProps) {
		super(EVENTS.USER_PROFILE_UPDATED)
		this.payload = props
	}

	public toJSON() {
		return {
			id: this.id,
			eventName: this.eventName,
			date: this.date,
			payload: this.payload,
		}
	}
}
```

Em `apps/backend/src/user/domain/user.ts`, atualizar `updateProfile()`:

```typescript
	public updateProfile(
		input: UserUpdateProps,
	): Either<UserValidationErrors[], null> {
		const validationResult = User.validateNameAndEmail(
			input.name ?? this.name,
			input.email ?? this.email,
		)
		if (validationResult.isFailure()) {
			return failure(validationResult.value)
		}
		this._name = validationResult.value.name
		this._email = validationResult.value.email
		void this.refreshUpdatedAt()
		const event = new UserProfileUpdatedEvent({
			userId: this.id,
			email: this.email,
			name: this.name,
		})
		this.notify(event)
		return success(null)
	}
```

Em `apps/backend/src/user/application/use-case/update-my-profile.usecase.ts`, religar o evento:

```typescript
import { inject, injectable } from "inversify"
import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher"
import { type Either, failure, success } from "@/shared/domain/value-object/either"
import { USER_TYPES } from "@/shared/infra/ioc/types"
import type { UserProfileUpdatedEvent } from "@/user/domain/event/user-profile-updated-event"
import type { UserValidationErrors } from "@/user/domain/user"
import { UserNotFoundError } from "../error/user-not-found-error"
import type { UserRepository } from "../persistence/repository/user-repository"

export interface UpdateMyProfileUseCaseInput {
	userId: string
	name: string
}
export interface UpdateMyProfileUseCaseOutputDTO {
	name: string
}
export type UpdateMyProfileUseCaseOutput = Either<
	UserNotFoundError | UserValidationErrors[],
	UpdateMyProfileUseCaseOutputDTO
>

@injectable()
export class UpdateMyProfileUseCase {
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
		input: UpdateMyProfileUseCaseInput,
	): Promise<UpdateMyProfileUseCaseOutput> {
		const user = await this.userRepository.userOfId(input.userId)
		if (!user) return failure(new UserNotFoundError())
		user.subscribe(this.handleUserProfileUpdatedEvent)
		const updateResult = user.updateProfile({ name: input.name, email: user.email })
		if (updateResult.isFailure()) return failure(updateResult.value)
		await this.userRepository.update(user)
		return success({ name: user.name })
	}

	private handleUserProfileUpdatedEvent(data: UserProfileUpdatedEvent): void {
		void DomainEventPublisher.instance.publish(data)
	}
}
```

- **Step 4: Rodar o teste e confirmar o sucesso**

Run: `npx vitest --run --config ./test/vite.config.app-domain.ts src/user/application/use-case/update-my-profile.usecase.test.ts` (a partir de `apps/backend/`)
Expected: PASS — todos os testes do arquivo, incluindo o novo.

- **Step 5: Commit**

Commit pulado — orquestrador faz commit na barreira de integração da wave; reporte os arquivos alterados (esta task está na Wave 1, execução paralela).

## Critérios de Sucesso

- Atualizar o próprio perfil via `UpdateMyProfileUseCase.execute()` com sucesso publica exatamente um `UserProfileUpdatedEvent` com `userId`, `name` e `email` atualizados (FR-009).
- `UserProfileUpdatedEventProps` inclui `userId: string` e o único call site (`User.updateProfile`) foi atualizado.
- Tentativas de atualização que falham (usuário inexistente, nome/email inválido) não publicam `UserProfileUpdatedEvent`.
- Todos os testes de `update-my-profile.usecase.test.ts`, incluindo os pré-existentes, passam.
