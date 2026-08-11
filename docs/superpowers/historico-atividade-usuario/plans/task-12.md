# Task 12: RecordUserActivitySubscriber — assina os 7 eventos, formata descrição pt-BR, grava, falha não propaga [FR-006, FR-007, FR-008, FR-009, FR-014]

**Status:** PENDING
**PRD:** `../prd/prd-historico-atividade-usuario.md`
**Spec:** `../specs/historico-atividade-usuario-design.md`
**Tier:** standard
**Depends on:** task-01, task-03, task-04, task-11, task-13

## Visão Geral

Criar `RecordUserActivitySubscriber`, o único ponto que assina os 7 eventos de conta relevantes para o histórico de atividade (`LOGIN_SUCCEEDED`, `PASSWORD_CHANGED`, `GOOGLE_ACCOUNT_LINKED`, `ACCOUNT_LOCKED_BY_SECURITY`, `USER_PROFILE_UPDATED`, `USER_ROLE_CHANGED`, `USER_STATUS_CHANGED`), formata uma descrição em pt-BR para cada um e grava via `UserActivityRepository.record()` (task 11). Uma falha ao gravar nunca deve propagar para o publisher nem para a use case original que disparou o evento (FR-014) — o `handle()` envolve a gravação em `try/catch` e nunca relança, seguindo o mesmo padrão de `CreateNotificationOnCheckInEventHandler`.

`PasswordChangedEventProps` (`{ userName, userEmail }`), diferente de `GoogleAccountLinkedEventProps` e `UserProfileUpdatedEventProps` (já corrigidos nas tasks 03 e 04), ainda não inclui `userId` — nenhuma outra task nesta feature toca no evento de senha alterada. Esta task fecha essa lacuna: adiciona `userId` à interface do evento e ao único lugar de produção que o constrói, `User.changePassword()` em `apps/backend/src/user/domain/user.ts`. Tornar `userId` obrigatório também torna incompletas 2 construções pré-existentes de `new PasswordChangedEvent({...})` em arquivos de teste que não passam `userId` — `send-password-alert-email.notification.test.ts` (5 ocorrências) e `domain-event-publisher.test.ts` (1 ocorrência) — ambos precisam ser atualizados nesta mesma task (achado de revisão).

Esta task também registra os 2 novos tipos de DI (`USER_TYPES.Repositories.UserActivity`, `USER_TYPES.EventHandlers.RecordUserActivity`), cria o `UserActivityRepositoryProvider` (mesmo padrão de `UserRepositoryProvider`: in-memory fora de produção, Prisma em produção) e conecta o subscriber no bootstrap da aplicação.

**Depende de task-03 e task-04** porque ambas editam `apps/backend/src/user/domain/user.ts` (mesmo arquivo que esta task edita, em outro método) — rodar em paralelo causaria conflito de merge. **Depende de task-13** porque ambas editam `shared/infra/ioc/module/service-identifier/user-types.ts` e `shared/infra/ioc/module/user/user-module.ts` — pelo mesmo motivo.

## Arquivos

- Create: `apps/backend/src/user/infra/event-handler/record-user-activity.subscriber.ts`
- Create: `apps/backend/src/shared/infra/ioc/module/user/user-activity-repository-provider.ts`
- Modify: `apps/backend/src/user/domain/event/password-changed-event.ts`
- Modify: `apps/backend/src/user/domain/user.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/service-identifier/user-types.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/user/user-module.ts`
- Modify: `apps/backend/src/bootstrap/setup-user-module.ts`
- Modify: `apps/backend/src/user/infra/email/send-password-alert-email.notification.test.ts` (5 construções de `PasswordChangedEvent` ganham `userId`)
- Modify: `apps/backend/src/shared/domain/event/domain-event-publisher.test.ts` (1 construção de `PasswordChangedEvent` ganha `userId`)
- Test: `apps/backend/src/user/infra/event-handler/record-user-activity.subscriber.test.ts`

### Conformidade com as Skills Padrão

- `no-workarounds`: a falha isolada (FR-014) é resolvida com `try/catch` real dentro do handler — não com `.catch(() => {})` silencioso na publicação (que já existe no `DomainEventPublisher`) nem com um `setTimeout`/retry artificial.
- `typescript-advanced`: `toRecordInput` faz narrowing de `DomainEvent<unknown>` para cada subtipo via `instanceof`, mapeando para `RecordUserActivityInput` com o `type` como union literal.
- `test-antipatterns`: o teste usa `InMemoryUserActivityRepository` real (task 11) para os 7 casos felizes, e um repositório fake que rejeita (não um `vi.fn()` genérico desacoplado do contrato) só para o teste de FR-014 — sem inspecionar chamadas internas do publisher.

## Passos

- **Step 1: Escrever o teste falhando**

```typescript
// apps/backend/src/user/infra/event-handler/record-user-activity.subscriber.test.ts
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher"
import { InMemoryUserActivityRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-activity-repository"
import { AccountLockedBySecurityEvent } from "@/user/domain/event/account-locked-by-security-event"
import { GoogleAccountLinkedEvent } from "@/user/domain/event/google-account-linked-event"
import { LoginSucceededEvent } from "@/user/domain/event/login-succeeded.event"
import { PasswordChangedEvent } from "@/user/domain/event/password-changed-event"
import { UserProfileUpdatedEvent } from "@/user/domain/event/user-profile-updated-event"
import { UserRoleChangedEvent } from "@/user/domain/event/user-role-changed.event"
import { UserStatusChangedEvent } from "@/user/domain/event/user-status-changed.event"
import type { UserActivityRepository } from "@/user/application/persistence/repository/user-activity-repository"
import { RecordUserActivitySubscriber } from "./record-user-activity.subscriber"

describe("RecordUserActivitySubscriber", () => {
	let repository: InMemoryUserActivityRepository
	let sut: RecordUserActivitySubscriber

	beforeEach(() => {
		repository = new InMemoryUserActivityRepository()
		sut = new RecordUserActivitySubscriber(repository)
		sut.subscribe()
	})

	afterEach(() => {
		sut.unsubscribe()
	})

	test("deve gravar atividade LOGIN ao publicar LoginSucceededEvent", async () => {
		await DomainEventPublisher.instance.publish(
			new LoginSucceededEvent({
				userId: "user-1",
				userEmail: "john@doe.com",
				userName: "John Doe",
			}),
		)

		expect(repository.records).toHaveLength(1)
		expect(repository.records[0]).toMatchObject({
			userId: "user-1",
			type: "LOGIN",
			description: "Login realizado",
		})
	})

	test("deve gravar atividade PASSWORD_CHANGED ao publicar PasswordChangedEvent", async () => {
		await DomainEventPublisher.instance.publish(
			new PasswordChangedEvent({
				userId: "user-1",
				userName: "John Doe",
				userEmail: "john@doe.com",
			}),
		)

		expect(repository.records).toHaveLength(1)
		expect(repository.records[0]).toMatchObject({
			userId: "user-1",
			type: "PASSWORD_CHANGED",
			description: "Senha alterada",
		})
	})

	test("deve gravar atividade GOOGLE_LINKED ao publicar GoogleAccountLinkedEvent", async () => {
		await DomainEventPublisher.instance.publish(
			new GoogleAccountLinkedEvent({
				userId: "user-1",
				userEmail: "john@doe.com",
				googleId: "google-sub-123",
			}),
		)

		expect(repository.records).toHaveLength(1)
		expect(repository.records[0]).toMatchObject({
			userId: "user-1",
			type: "GOOGLE_LINKED",
			description: "Conta Google vinculada",
		})
	})

	test("deve gravar atividade ACCOUNT_LOCKED ao publicar AccountLockedBySecurityEvent", async () => {
		await DomainEventPublisher.instance.publish(
			new AccountLockedBySecurityEvent({
				userId: "user-1",
				userEmail: "john@doe.com",
				userName: "John Doe",
				resetToken: "raw-token",
			}),
		)

		expect(repository.records).toHaveLength(1)
		expect(repository.records[0]).toMatchObject({
			userId: "user-1",
			type: "ACCOUNT_LOCKED",
			description: "Conta bloqueada por segurança",
		})
	})

	test("deve gravar atividade PROFILE_UPDATED ao publicar UserProfileUpdatedEvent", async () => {
		await DomainEventPublisher.instance.publish(
			new UserProfileUpdatedEvent({
				userId: "user-1",
				name: "John Doe Jr.",
				email: "john@doe.com",
			}),
		)

		expect(repository.records).toHaveLength(1)
		expect(repository.records[0]).toMatchObject({
			userId: "user-1",
			type: "PROFILE_UPDATED",
			description: "Perfil atualizado",
		})
	})

	test("deve gravar atividade ROLE_CHANGED com metadata ao publicar UserRoleChangedEvent", async () => {
		await DomainEventPublisher.instance.publish(
			new UserRoleChangedEvent({
				userId: "user-1",
				userEmail: "john@doe.com",
				userName: "John Doe",
				previousRole: "MEMBER",
				newRole: "ADMIN",
			}),
		)

		expect(repository.records).toHaveLength(1)
		expect(repository.records[0]).toMatchObject({
			userId: "user-1",
			type: "ROLE_CHANGED",
			description: "Role alterada para Administrador",
			metadata: { previousRole: "MEMBER", newRole: "ADMIN" },
		})
	})

	test("deve gravar atividade STATUS_CHANGED com metadata ao publicar UserStatusChangedEvent", async () => {
		await DomainEventPublisher.instance.publish(
			new UserStatusChangedEvent({
				userId: "user-1",
				userEmail: "john@doe.com",
				userName: "John Doe",
				previousStatus: "activated",
				newStatus: "suspended",
			}),
		)

		expect(repository.records).toHaveLength(1)
		expect(repository.records[0]).toMatchObject({
			userId: "user-1",
			type: "STATUS_CHANGED",
			description: "Conta suspensa",
			metadata: { previousStatus: "activated", newStatus: "suspended" },
		})
	})

	test("uma falha ao gravar não deve propagar (FR-014)", async () => {
		const failingRepository: UserActivityRepository = {
			record: vi.fn().mockRejectedValue(new Error("db down")),
		}
		const consoleErrorSpy = vi
			.spyOn(console, "error")
			.mockImplementation(() => undefined)
		const failingSut = new RecordUserActivitySubscriber(failingRepository)
		failingSut.subscribe()

		try {
			await expect(
				DomainEventPublisher.instance.publish(
					new LoginSucceededEvent({
						userId: "user-1",
						userEmail: "john@doe.com",
						userName: "John Doe",
					}),
				),
			).resolves.toBeUndefined()
		} finally {
			failingSut.unsubscribe()
			consoleErrorSpy.mockRestore()
		}

		expect(failingRepository.record).toHaveBeenCalledTimes(1)
		expect(consoleErrorSpy).toHaveBeenCalledWith(
			expect.stringContaining("userId=user-1 type=LOGIN"),
			expect.any(Error),
		)
	})
})
```

- **Step 2: Rodar o teste e confirmar a falha**

Run: `npx vitest --run --config ./test/vite.config.app-domain.ts src/user/infra/event-handler/record-user-activity.subscriber.test.ts` (a partir de `apps/backend/`)
Expected: FAIL — `Cannot find module './record-user-activity.subscriber'` (o subscriber ainda não existe) e erros de tipagem em `PasswordChangedEvent`/`GoogleAccountLinkedEvent` faltando `userId` no construtor. Depois de tornar `userId` obrigatório em `PasswordChangedEventProps`, `send-password-alert-email.notification.test.ts` e `domain-event-publisher.test.ts` também param de compilar até serem atualizados (ver Step 3).

- **Step 3: Implementação mínima**

Em `apps/backend/src/user/domain/event/password-changed-event.ts`, adicionar `userId`:

```typescript
import { DomainEvent } from "@/shared/domain/event/domain-event"
import { EVENTS } from "@/shared/domain/event/events"

export interface PasswordChangedEventProps {
	userId: string
	userName: string
	userEmail: string
}

export class PasswordChangedEvent extends DomainEvent<PasswordChangedEventProps> {
	readonly payload: PasswordChangedEventProps

	constructor(props: PasswordChangedEventProps) {
		super(EVENTS.PASSWORD_CHANGED)
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

Em `apps/backend/src/user/domain/user.ts`, atualizar `changePassword()`:

```typescript
	public async changePassword(
		newRawPassword: string,
	): Promise<Either<ValidationError, null>> {
		const passwordCreateResult = await Password.create(newRawPassword)
		if (passwordCreateResult.isFailure()) {
			return failure(passwordCreateResult.value)
		}
		this._password = passwordCreateResult.value
		void this.refreshUpdatedAt()
		const event = new PasswordChangedEvent({
			userId: this.id,
			userName: this.name,
			userEmail: this.email,
		})
		void this.notify(event)
		return success(null)
	}
```

Atualizar as 5 construções de `PasswordChangedEvent` em `apps/backend/src/user/infra/email/send-password-alert-email.notification.test.ts` (linhas 30, 46, 57, 68, 84), adicionando `userId: "any_user_id"` como primeiro campo de cada uma:

```typescript
			new PasswordChangedEvent({
				userId: "any_user_id",
				userEmail: "joao@example.com",
				userName: "João Silva",
			}),
```

Atualizar a única construção de `PasswordChangedEvent` em `apps/backend/src/shared/domain/event/domain-event-publisher.test.ts` (linha 46), adicionando `userId`:

```typescript
		const passwordChangedEvent = new PasswordChangedEvent({
			userId: "any_user_id",
			userName: "any-name",
			userEmail: "user@mail.com",
		})
```

Criar o subscriber:

```typescript
// apps/backend/src/user/infra/event-handler/record-user-activity.subscriber.ts
import { inject, injectable } from "inversify"
import type { DomainEvent } from "@/shared/domain/event/domain-event"
import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher"
import { EVENTS } from "@/shared/domain/event/events"
import { USER_TYPES } from "@/shared/infra/ioc/types"
import type {
	RecordUserActivityInput,
	UserActivityRepository,
} from "@/user/application/persistence/repository/user-activity-repository"
import { AccountLockedBySecurityEvent } from "@/user/domain/event/account-locked-by-security-event"
import { GoogleAccountLinkedEvent } from "@/user/domain/event/google-account-linked-event"
import { LoginSucceededEvent } from "@/user/domain/event/login-succeeded.event"
import { PasswordChangedEvent } from "@/user/domain/event/password-changed-event"
import { UserProfileUpdatedEvent } from "@/user/domain/event/user-profile-updated-event"
import { UserRoleChangedEvent } from "@/user/domain/event/user-role-changed.event"
import { UserStatusChangedEvent } from "@/user/domain/event/user-status-changed.event"

const ROLE_LABELS: Record<string, string> = {
	ADMIN: "Administrador",
	MEMBER: "Membro",
}

const STATUS_CHANGE_DESCRIPTIONS: Record<string, string> = {
	activated: "Conta reativada",
	suspended: "Conta suspensa",
	locked: "Conta bloqueada",
}

@injectable()
export class RecordUserActivitySubscriber {
	private readonly boundHandle: (event: DomainEvent<unknown>) => Promise<void>

	constructor(
		@inject(USER_TYPES.Repositories.UserActivity)
		private readonly userActivityRepository: UserActivityRepository,
	) {
		this.boundHandle = this.handle.bind(this)
	}

	public subscribe(): void {
		DomainEventPublisher.instance.subscribe(EVENTS.LOGIN_SUCCEEDED, this.boundHandle)
		DomainEventPublisher.instance.subscribe(EVENTS.PASSWORD_CHANGED, this.boundHandle)
		DomainEventPublisher.instance.subscribe(EVENTS.GOOGLE_ACCOUNT_LINKED, this.boundHandle)
		DomainEventPublisher.instance.subscribe(
			EVENTS.ACCOUNT_LOCKED_BY_SECURITY,
			this.boundHandle,
		)
		DomainEventPublisher.instance.subscribe(EVENTS.USER_PROFILE_UPDATED, this.boundHandle)
		DomainEventPublisher.instance.subscribe(EVENTS.USER_ROLE_CHANGED, this.boundHandle)
		DomainEventPublisher.instance.subscribe(EVENTS.USER_STATUS_CHANGED, this.boundHandle)
	}

	public unsubscribe(): void {
		DomainEventPublisher.instance.unsubscribe(EVENTS.LOGIN_SUCCEEDED, this.boundHandle)
		DomainEventPublisher.instance.unsubscribe(EVENTS.PASSWORD_CHANGED, this.boundHandle)
		DomainEventPublisher.instance.unsubscribe(
			EVENTS.GOOGLE_ACCOUNT_LINKED,
			this.boundHandle,
		)
		DomainEventPublisher.instance.unsubscribe(
			EVENTS.ACCOUNT_LOCKED_BY_SECURITY,
			this.boundHandle,
		)
		DomainEventPublisher.instance.unsubscribe(
			EVENTS.USER_PROFILE_UPDATED,
			this.boundHandle,
		)
		DomainEventPublisher.instance.unsubscribe(EVENTS.USER_ROLE_CHANGED, this.boundHandle)
		DomainEventPublisher.instance.unsubscribe(
			EVENTS.USER_STATUS_CHANGED,
			this.boundHandle,
		)
	}

	private async handle(event: DomainEvent<unknown>): Promise<void> {
		let recordInput: RecordUserActivityInput | null = null
		try {
			recordInput = this.toRecordInput(event)
			if (!recordInput) return
			await this.userActivityRepository.record(recordInput)
		} catch (error) {
			console.error(
				`[RecordUserActivitySubscriber] Falha ao registrar atividade userId=${recordInput?.userId ?? "desconhecido"} type=${recordInput?.type ?? "desconhecido"}:`,
				error,
			)
		}
	}

	private toRecordInput(
		event: DomainEvent<unknown>,
	): RecordUserActivityInput | null {
		if (event instanceof LoginSucceededEvent) {
			return {
				userId: event.payload.userId,
				type: "LOGIN",
				description: "Login realizado",
				occurredAt: event.date,
			}
		}
		if (event instanceof PasswordChangedEvent) {
			return {
				userId: event.payload.userId,
				type: "PASSWORD_CHANGED",
				description: "Senha alterada",
				occurredAt: event.date,
			}
		}
		if (event instanceof GoogleAccountLinkedEvent) {
			return {
				userId: event.payload.userId,
				type: "GOOGLE_LINKED",
				description: "Conta Google vinculada",
				occurredAt: event.date,
			}
		}
		if (event instanceof AccountLockedBySecurityEvent) {
			return {
				userId: event.payload.userId,
				type: "ACCOUNT_LOCKED",
				description: "Conta bloqueada por segurança",
				occurredAt: event.date,
			}
		}
		if (event instanceof UserProfileUpdatedEvent) {
			return {
				userId: event.payload.userId,
				type: "PROFILE_UPDATED",
				description: "Perfil atualizado",
				occurredAt: event.date,
			}
		}
		if (event instanceof UserRoleChangedEvent) {
			const roleLabel = ROLE_LABELS[event.payload.newRole] ?? event.payload.newRole
			return {
				userId: event.payload.userId,
				type: "ROLE_CHANGED",
				description: `Role alterada para ${roleLabel}`,
				metadata: {
					previousRole: event.payload.previousRole,
					newRole: event.payload.newRole,
				},
				occurredAt: event.date,
			}
		}
		if (event instanceof UserStatusChangedEvent) {
			const description =
				STATUS_CHANGE_DESCRIPTIONS[event.payload.newStatus] ??
				event.payload.newStatus
			return {
				userId: event.payload.userId,
				type: "STATUS_CHANGED",
				description,
				metadata: {
					previousStatus: event.payload.previousStatus,
					newStatus: event.payload.newStatus,
				},
				occurredAt: event.date,
			}
		}
		return null
	}
}
```

Adicionar os 2 novos tipos de DI em `apps/backend/src/shared/infra/ioc/module/service-identifier/user-types.ts`, dentro do objeto `USER_TYPES`:

```typescript
	Repositories: {
		User: Symbol.for("UserRepository"),
		UserActivity: Symbol.for("UserActivityRepository"),
	},
	// ...
	EventHandlers: {
		RecordUserActivity: Symbol.for("RecordUserActivitySubscriber"),
	},
```

Criar o provider (mesmo padrão de `UserRepositoryProvider`):

```typescript
// apps/backend/src/shared/infra/ioc/module/user/user-activity-repository-provider.ts
import type { ResolutionContext } from "inversify"
import { InMemoryUserActivityRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-activity-repository.js"
import { PrismaUserActivityRepository } from "@/shared/infra/database/repository/prisma/prisma-user-activity-repository"
import { isProduction } from "@/shared/infra/env"
import type { UserActivityRepository } from "@/user/application/persistence/repository/user-activity-repository"

export class UserActivityRepositoryProvider {
	public static provide(context: ResolutionContext): UserActivityRepository {
		if (!isProduction()) {
			return context.get(InMemoryUserActivityRepository, { autobind: true })
		}
		return context.get(PrismaUserActivityRepository, { autobind: true })
	}
}
```

Em `apps/backend/src/shared/infra/ioc/module/user/user-module.ts`, adicionar os imports e os 2 binds:

```typescript
import { RecordUserActivitySubscriber } from "@/user/infra/event-handler/record-user-activity.subscriber"
import { UserActivityRepositoryProvider } from "./user-activity-repository-provider"
```

```typescript
	bind(USER_TYPES.Repositories.UserActivity)
		.toDynamicValue(UserActivityRepositoryProvider.provide)
		.inSingletonScope()
	bind(USER_TYPES.EventHandlers.RecordUserActivity)
		.to(RecordUserActivitySubscriber)
		.inSingletonScope()
```

Em `apps/backend/src/bootstrap/setup-user-module.ts`, adicionar o import e o `.subscribe()`:

```typescript
import type { RecordUserActivitySubscriber } from "@/user/infra/event-handler/record-user-activity.subscriber"
```

```typescript
	const recordUserActivitySubscriber = resolve<RecordUserActivitySubscriber>(
		USER_TYPES.EventHandlers.RecordUserActivity,
	)
	recordUserActivitySubscriber.subscribe()
```

(adicionar junto aos outros `.subscribe()` já existentes em `setupUserModule()`, antes do array `controllers`).

- **Step 4: Rodar o teste e confirmar o sucesso**

Run: `npx vitest --run --config ./test/vite.config.app-domain.ts src/user/infra/event-handler/record-user-activity.subscriber.test.ts` (a partir de `apps/backend/`)
Expected: PASS — os 8 testes (7 tipos de evento + o de falha isolada).

- **Step 5: Commit**

Commit pulado — orquestrador faz commit na barreira de integração da wave; reporte os arquivos alterados (esta task está na Wave 3, execução paralela).

## Critérios de Sucesso

- Publicar qualquer um dos 7 eventos (`LOGIN_SUCCEEDED`, `PASSWORD_CHANGED`, `GOOGLE_ACCOUNT_LINKED`, `ACCOUNT_LOCKED_BY_SECURITY`, `USER_PROFILE_UPDATED`, `USER_ROLE_CHANGED`, `USER_STATUS_CHANGED`) resulta em exatamente uma chamada a `UserActivityRepository.record()` com `type`/`description` em pt-BR corretos (FR-006, FR-007, FR-008, FR-009).
- `UserRoleChangedEvent` e `UserStatusChangedEvent` gravam `metadata` com `previousRole`/`newRole` e `previousStatus`/`newStatus` respectivamente.
- Quando `UserActivityRepository.record()` rejeita, `DomainEventPublisher.instance.publish(...)` ainda resolve normalmente (não propaga o erro) — FR-014 — e o log de erro inclui `userId` e `type` do evento que falhou, não apenas a mensagem genérica do `DomainEventPublisher`.
- `PasswordChangedEventProps` inclui `userId: string`; o call site de produção (`User.changePassword`) e os 2 arquivos de teste pré-existentes que constroem o evento (`send-password-alert-email.notification.test.ts`, `domain-event-publisher.test.ts`) foram atualizados para incluir `userId`.
- `USER_TYPES.Repositories.UserActivity` e `USER_TYPES.EventHandlers.RecordUserActivity` resolvem via container (in-memory fora de produção, Prisma em produção).
