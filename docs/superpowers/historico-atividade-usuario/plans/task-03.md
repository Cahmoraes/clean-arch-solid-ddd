# Task 3: authenticate-with-google.usecase.ts publica LoginSucceededEvent e religa GoogleAccountLinkedEvent [FR-005, FR-007]

**Status:** PENDING
**PRD:** `../prd/prd-historico-atividade-usuario.md`
**Spec:** `../specs/historico-atividade-usuario-design.md`
**Tier:** capable
**Depends on:** task-01

## Visão Geral

`AuthenticateWithGoogleUseCase` tem 4 pontos de sucesso (login com Google já vinculado, vínculo novo + login, recuperação de race condition, criação de usuário novo + login) e todos devem publicar `LoginSucceededEvent` (FR-005). Além disso, `GoogleAccountLinkedEvent` já é disparado internamente por `User.linkGoogleAccount()` (via `this.notify(...)`) mas hoje é órfão — ninguém o republica no `DomainEventPublisher` global. Esta task religa esse evento no único ponto que chama `linkGoogleAccount()` (`linkAndAuthenticate`), seguindo o mesmo padrão `user.subscribe(...)` já usado em `change-password.usecase.ts` (FR-007).

`GoogleAccountLinkedEventProps` hoje é `{ userEmail: string; googleId: string }` e não inclui `userId`, que é necessário para `RecordUserActivitySubscriber` (task 12) saber de qual usuário é o evento. Esta task adiciona `userId` ao payload, o que exige alterar tanto a interface do evento quanto o único lugar que o constrói: `User.linkGoogleAccount()` em `apps/backend/src/user/domain/user.ts`.

## Arquivos

- Modify: `apps/backend/src/session/application/use-case/authenticate-with-google.usecase.ts`
- Modify: `apps/backend/src/user/domain/event/google-account-linked-event.ts`
- Modify: `apps/backend/src/user/domain/user.ts`
- Test: `apps/backend/src/session/application/use-case/authenticate-with-google.usecase.test.ts`

### Conformidade com as Skills Padrão

- `typescript-advanced`: extensão da interface `GoogleAccountLinkedEventProps` com um novo campo obrigatório (`userId`) — garantir que o único call site (`User.linkGoogleAccount`) seja atualizado para não quebrar a tipagem.
- `no-workarounds`: adicionar `userId` ao payload deve ser feito na raiz (na interface do evento e no seu único construtor), não com um cast ou um valor vazio (`""`) só para satisfazer o compilador.
- `test-antipatterns`: os 2 testes novos devem publicar e observar eventos reais via `DomainEventPublisher`, sem mockar o publisher; usar o `InMemoryGoogleAuthProvider` e `InMemoryUserRepository` já usados no arquivo, não um mock parcial da use case.

## Passos

- **Step 1: Escrever os testes falhando**

Em `apps/backend/src/user/domain/event/google-account-linked-event.ts`, o teste implícito é o compilador: qualquer código que hoje constrói `new GoogleAccountLinkedEvent({ userEmail, googleId })` sem `userId` deve passar a falhar a tipagem — isso será resolvido no Step 3. O teste comportamental fica em `authenticate-with-google.usecase.test.ts`. Adicionar ao topo do arquivo (que já importa `createAndSaveUser`, `setupInMemoryRepositories`, `container`, `AUTH_TYPES`, `SHARED_TYPES`, `InMemoryUserRepository`, `InMemoryGoogleAuthProvider`):

```typescript
import { vi } from "vitest"
import type { Subscriber } from "@/shared/domain/event/domain-event-publisher"
import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher"
import { GoogleAccountLinkedEvent } from "@/user/domain/event/google-account-linked-event"
import { LoginSucceededEvent } from "@/user/domain/event/login-succeeded.event"
```

E adicionar, dentro do `describe("AuthenticateWithGoogleUseCase", ...)`, ao final (antes do `})` de fechamento):

```typescript
	test("deve publicar LoginSucceededEvent ao autenticar usuário existente com googleId", async () => {
		await createAndSaveUser({
			userRepository,
			googleId: "google-sub-123",
			email: "john@doe.com",
		})
		googleAuthProvider.addValidToken("valid-token", {
			sub: "google-sub-123",
			email: "john@doe.com",
			name: "John Doe",
			emailVerified: true,
		})

		let receivedEvent: LoginSucceededEvent | null = null
		const subscriber: Subscriber<unknown> = (event) => {
			if (event instanceof LoginSucceededEvent) receivedEvent = event
		}
		DomainEventPublisher.instance.subscribe("loginSucceeded", subscriber)

		try {
			await sut.execute({ idToken: "valid-token" })
		} finally {
			DomainEventPublisher.instance.unsubscribe("loginSucceeded", subscriber)
		}

		expect(receivedEvent).not.toBeNull()
		expect(receivedEvent).toEqual(
			expect.objectContaining({
				payload: expect.objectContaining({ userEmail: "john@doe.com" }),
			}),
		)
	})

	test("deve publicar GoogleAccountLinkedEvent e LoginSucceededEvent ao religar uma conta Google já vinculada encontrada por e-mail", async () => {
		// Cenário: o usuário já tem googleId salvo, mas a busca direta por
		// googleId (userOfGoogleId) não o encontra nesta chamada (ex.: réplica
		// de leitura atrasada) — o fluxo cai em resolveByEmail -> linkAndAuthenticate,
		// que revalida e re-vincula o mesmo googleId.
		const existingUser = await createAndSaveUser({
			userRepository,
			email: "john@doe.com",
			name: "John Doe",
			googleId: "google-sub-999",
		})
		googleAuthProvider.addValidToken("relink-token", {
			sub: "google-sub-999",
			email: "john@doe.com",
			name: "John Doe",
			emailVerified: true,
		})
		vi.spyOn(userRepository, "userOfGoogleId").mockResolvedValueOnce(null)

		let receivedLinked: GoogleAccountLinkedEvent | null = null
		const linkedSubscriber: Subscriber<unknown> = (event) => {
			if (event instanceof GoogleAccountLinkedEvent) receivedLinked = event
		}
		let receivedLogin: LoginSucceededEvent | null = null
		const loginSubscriber: Subscriber<unknown> = (event) => {
			if (event instanceof LoginSucceededEvent) receivedLogin = event
		}
		DomainEventPublisher.instance.subscribe(
			"googleAccountLinked",
			linkedSubscriber,
		)
		DomainEventPublisher.instance.subscribe("loginSucceeded", loginSubscriber)

		try {
			const result = await sut.execute({ idToken: "relink-token" })
			expect(result.isSuccess()).toBe(true)
		} finally {
			DomainEventPublisher.instance.unsubscribe(
				"googleAccountLinked",
				linkedSubscriber,
			)
			DomainEventPublisher.instance.unsubscribe(
				"loginSucceeded",
				loginSubscriber,
			)
			vi.restoreAllMocks()
		}

		expect(receivedLinked).not.toBeNull()
		expect(receivedLinked).toEqual(
			expect.objectContaining({
				payload: expect.objectContaining({
					userId: existingUser.id,
					googleId: "google-sub-999",
				}),
			}),
		)
		expect(receivedLogin).not.toBeNull()
	})
```

- **Step 2: Rodar os testes e confirmar a falha**

Run: `npx vitest --run --config ./test/vite.config.app-domain.ts src/session/application/use-case/authenticate-with-google.usecase.test.ts` (a partir de `apps/backend/`)
Expected: FAIL — `receivedEvent`/`receivedLogin` permanecem `null` (nenhum evento é publicado ainda) e/ou erro de tipagem em `GoogleAccountLinkedEventProps` faltando `userId`.

- **Step 3: Implementação mínima**

Em `apps/backend/src/user/domain/event/google-account-linked-event.ts`, adicionar `userId` ao payload:

```typescript
import { DomainEvent } from "@/shared/domain/event/domain-event"
import { EVENTS } from "@/shared/domain/event/events"

export interface GoogleAccountLinkedEventProps {
	userId: string
	userEmail: string
	googleId: string
}

export class GoogleAccountLinkedEvent extends DomainEvent<GoogleAccountLinkedEventProps> {
	readonly payload: GoogleAccountLinkedEventProps

	constructor(props: GoogleAccountLinkedEventProps) {
		super(EVENTS.GOOGLE_ACCOUNT_LINKED)
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

Em `apps/backend/src/user/domain/user.ts`, atualizar `linkGoogleAccount()` para incluir `userId`:

```typescript
	public linkGoogleAccount(googleId: GoogleId): void {
		this._googleId = googleId
		this.refreshUpdatedAt()
		const event = new GoogleAccountLinkedEvent({
			userId: this.id,
			userEmail: this.email,
			googleId: googleId.value,
		})
		this.notify(event)
	}
```

Em `apps/backend/src/session/application/use-case/authenticate-with-google.usecase.ts`, adicionar os imports:

```typescript
import { DomainEvent } from "@/shared/domain/event/domain-event.js"
import { GoogleAccountLinkedEvent } from "@/user/domain/event/google-account-linked-event.js"
import { LoginSucceededEvent } from "@/user/domain/event/login-succeeded.event.js"
```

E alterar os 4 métodos privados relevantes:

```typescript
	private async resolveUser(
		googleUserInfo: GoogleUserInfo,
	): Promise<AuthenticateWithGoogleUseCaseOutput> {
		const userByGoogleId = await this.userRepository.userOfGoogleId(
			googleUserInfo.sub,
		)
		if (userByGoogleId) {
			await this.publishLoginSucceededEvent(userByGoogleId)
			return success(this.createAuthTokenOutput(userByGoogleId))
		}
		return this.resolveByEmail(googleUserInfo)
	}

	private async linkAndAuthenticate(
		user: User,
		googleSub: string,
	): Promise<AuthenticateWithGoogleUseCaseOutput> {
		if (user.googleId && user.googleId !== googleSub) {
			return failure(new GoogleAccountAlreadyLinkedError())
		}
		user.subscribe(this.handleGoogleAccountLinkedEvent)
		user.linkGoogleAccount(GoogleId.restore(googleSub))
		await this.userRepository.update(user)
		await this.publishLoginSucceededEvent(user)
		return success(this.createAuthTokenOutput(user))
	}

	private async createAndAuthenticate(
		googleUserInfo: GoogleUserInfo,
	): Promise<AuthenticateWithGoogleUseCaseOutput> {
		const createdUserResult = await User.create({
			name: googleUserInfo.name,
			email: googleUserInfo.email,
			googleId: googleUserInfo.sub,
		})
		if (createdUserResult.isFailure()) {
			return failure(new InvalidGoogleTokenError())
		}
		try {
			await this.userRepository.save(createdUserResult.value)
		} catch {
			// Race condition: concurrent request created the user first.
			// Recover by fetching the already-persisted user.
			const existing = await this.userRepository.userOfGoogleId(
				googleUserInfo.sub,
			)
			if (existing) {
				await this.publishLoginSucceededEvent(existing)
				return success(this.createAuthTokenOutput(existing))
			}
			throw new Error("Failed to persist Google user account")
		}
		await this.publishUserCreatedEvent(createdUserResult.value)
		await this.publishLoginSucceededEvent(createdUserResult.value)
		return success(this.createAuthTokenOutput(createdUserResult.value))
	}

	private async publishLoginSucceededEvent(user: User): Promise<void> {
		await DomainEventPublisher.instance.publish(
			new LoginSucceededEvent({
				userId: user.id,
				userEmail: user.email,
				userName: user.name,
			}),
		)
	}

	private handleGoogleAccountLinkedEvent(
		data: DomainEvent<unknown>,
	): void {
		if (data instanceof GoogleAccountLinkedEvent) {
			void DomainEventPublisher.instance.publish(data)
		}
	}
```

`resolveByEmail` não muda (continua delegando para `linkAndAuthenticate` ou `createAndAuthenticate`, que já publicam o evento).

- **Step 4: Rodar os testes e confirmar o sucesso**

Run: `npx vitest --run --config ./test/vite.config.app-domain.ts src/session/application/use-case/authenticate-with-google.usecase.test.ts` (a partir de `apps/backend/`)
Expected: PASS — todos os testes do arquivo, incluindo os 2 novos.

- **Step 5: Commit**

Commit pulado — orquestrador faz commit na barreira de integração da wave; reporte os arquivos alterados (esta task está na Wave 2, execução paralela).

## Critérios de Sucesso

- Os 4 caminhos de sucesso de `AuthenticateWithGoogleUseCase` (login com googleId já vinculado, vínculo novo, recuperação de race condition, criação de usuário) publicam exatamente um `LoginSucceededEvent` cada (FR-005).
- Vincular uma conta Google a um usuário existente (`linkAndAuthenticate`) publica exatamente um `GoogleAccountLinkedEvent` com `userId`, `userEmail` e `googleId` preenchidos (FR-007).
- `GoogleAccountLinkedEventProps` inclui `userId: string` e o único call site (`User.linkGoogleAccount`) foi atualizado — nenhum outro lugar do código constrói esse evento.
- Todos os testes de `authenticate-with-google.usecase.test.ts`, incluindo os pré-existentes, passam.
