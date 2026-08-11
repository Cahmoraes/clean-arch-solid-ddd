# Task 2: authenticate.usecase.ts publica LoginSucceededEvent [FR-005]

**Status:** PENDING
**PRD:** `../prd/prd-historico-atividade-usuario.md`
**Spec:** `../specs/historico-atividade-usuario-design.md`
**Tier:** cheap
**Depends on:** task-01

## Visão Geral

Fazer `AuthenticateUseCase` (login por email/senha) publicar `LoginSucceededEvent` no `DomainEventPublisher` sempre que um login for bem-sucedido, para que `RecordUserActivitySubscriber` (task 12) possa gravar o evento de atividade "login" (FR-005). `AuthenticateUseCase` já importa `DomainEventPublisher` (usado em `lockAccount()`), então só é preciso publicar o evento novo dentro de `validatePasswordAndAuthenticate()`, logo antes do `return success(...)` de sucesso.

## Arquivos

- Modify: `apps/backend/src/session/application/use-case/authenticate.usecase.ts`
- Test: `apps/backend/src/session/application/use-case/authenticate.usecase.test.ts`

### Conformidade com as Skills Padrão

- `typescript-advanced`: o payload de `LoginSucceededEvent` precisa casar com os getters de `User` (`user.id`, `user.email`, `user.name`).
- `test-antipatterns`: o novo teste deve verificar a publicação real do evento via subscribe/publish/unsubscribe no `DomainEventPublisher` (padrão já usado em `change-password.usecase.test.ts`), sem mockar o publisher.

## Passos

- **Step 1: Escrever o teste falhando**

Adicionar ao final do `describe("AuthenticateUseCase", ...)` em `apps/backend/src/session/application/use-case/authenticate.usecase.test.ts` (o arquivo já importa `setupInMemoryRepositories`, `container`, `AUTH_TYPES`, `SHARED_TYPES`; adicionar os 2 imports abaixo no topo do arquivo):

```typescript
import type { Subscriber } from "@/shared/domain/event/domain-event-publisher"
import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher"
import { LoginSucceededEvent } from "@/user/domain/event/login-succeeded.event"
```

```typescript
test("deve publicar LoginSucceededEvent após um login bem-sucedido", async () => {
	await createAndSaveUser({
		name: "John Doe",
		email: "john@doe.com",
		password: "Senha123!",
	})

	let receivedEvent: LoginSucceededEvent | null = null
	const subscriber: Subscriber<unknown> = (event) => {
		if (event instanceof LoginSucceededEvent) receivedEvent = event
	}
	DomainEventPublisher.instance.subscribe("loginSucceeded", subscriber)

	try {
		await sut.execute({ email: "john@doe.com", password: "Senha123!" })
	} finally {
		DomainEventPublisher.instance.unsubscribe("loginSucceeded", subscriber)
	}

	expect(receivedEvent).not.toBeNull()
	expect(receivedEvent).toEqual(
		expect.objectContaining({
			payload: expect.objectContaining({
				userEmail: "john@doe.com",
				userName: "John Doe",
			}),
		}),
	)
})
```

- **Step 2: Rodar o teste e confirmar a falha**

Run: `npx vitest --run --config ./test/vite.config.app-domain.ts src/session/application/use-case/authenticate.usecase.test.ts` (a partir de `apps/backend/`)
Expected: FAIL — `receivedEvent` permanece `null` (nenhum `LoginSucceededEvent` é publicado ainda).

- **Step 3: Implementação mínima**

Em `apps/backend/src/session/application/use-case/authenticate.usecase.ts`, adicionar o import:

```typescript
import { LoginSucceededEvent } from "@/user/domain/event/login-succeeded.event"
```

E alterar `validatePasswordAndAuthenticate()`:

```typescript
	private async validatePasswordAndAuthenticate(
		user: User,
		input: AuthenticateUseCaseInput,
	): Promise<AuthenticateUseCaseOutput> {
		const passwordValid = await user.checkPassword(input.password)
		if (!passwordValid) {
			if (!user.isSuperAdmin) {
				await this.handleFailedAttempt(user, input.email)
			}
			return failure(new InvalidCredentialsError())
		}
		if (!user.isSuperAdmin) {
			await this.loginAttemptStore.deleteFailedAttempts(input.email)
		}
		const jwi = this.createJSONWebId()
		await DomainEventPublisher.instance.publish(
			new LoginSucceededEvent({
				userId: user.id,
				userEmail: user.email,
				userName: user.name,
			}),
		)
		return success({
			token: this.signUserToken(user, jwi),
			refreshToken: this.createRefreshToken(user, jwi),
		})
	}
```

- **Step 4: Rodar o teste e confirmar o sucesso**

Run: `npx vitest --run --config ./test/vite.config.app-domain.ts src/session/application/use-case/authenticate.usecase.test.ts` (a partir de `apps/backend/`)
Expected: PASS — todos os testes do arquivo, incluindo o novo.

- **Step 5: Commit**

Commit pulado — orquestrador faz commit na barreira de integração da wave; reporte os arquivos alterados (esta task está na Wave 2, execução paralela).

## Critérios de Sucesso

- Um login bem-sucedido via `AuthenticateUseCase.execute()` publica exatamente um `LoginSucceededEvent` com `userId`, `userEmail` e `userName` do usuário autenticado (FR-005).
- Tentativas de login com falha (senha inválida, conta bloqueada, usuário inexistente) não publicam `LoginSucceededEvent` — comportamento coberto pelos testes de lockout já existentes, que continuam passando.
- O teste novo e todos os testes pré-existentes de `authenticate.usecase.test.ts` passam.
