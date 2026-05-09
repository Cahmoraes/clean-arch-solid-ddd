# Task 2: Value Object GoogleId + Erros de Domínio + Evento [RF-003, RF-004, RF-010, RF-011]

**Status:** PENDING
**PRD:** `../prd/prd-google-social-login.md`
**Spec:** `../specs/google-social-login-design.md`

## Visão Geral

Criar o Value Object `GoogleId`, os erros de domínio `InvalidGoogleTokenError` e `GoogleEmailNotVerifiedError`, o evento `GoogleAccountLinkedEvent`, e registrar o evento no catálogo `EVENTS`.

## Arquivos

- Create: `apps/backend/src/user/domain/value-object/google-id.ts`
- Create: `apps/backend/src/user/domain/value-object/google-id.test.ts`
- Create: `apps/backend/src/session/application/error/invalid-google-token-error.ts`
- Create: `apps/backend/src/session/application/error/google-email-not-verified-error.ts`
- Create: `apps/backend/src/user/domain/event/google-account-linked-event.ts`
- Modify: `apps/backend/src/shared/domain/event/events.ts`

## Passos

- [ ] **Step 1: Escrever teste do GoogleId**

Criar `apps/backend/src/user/domain/value-object/google-id.test.ts`:

```typescript
import { GoogleId } from "./google-id.js"

describe("GoogleId", () => {
	test("Deve criar um GoogleId válido", () => {
		const result = GoogleId.create("1234567890")
		expect(result.isSuccess()).toBe(true)
		expect(result.force.success().value.value).toBe("1234567890")
	})

	test("Não deve criar um GoogleId com string vazia", () => {
		const result = GoogleId.create("")
		expect(result.isFailure()).toBe(true)
	})

	test("Deve restaurar um GoogleId", () => {
		const googleId = GoogleId.restore("1234567890")
		expect(googleId.value).toBe("1234567890")
	})
})
```

- [ ] **Step 2: Rodar teste para verificar que falha**

```bash
pnpm --filter backend test:run -- -t "GoogleId"
```

Esperado: FAIL — módulo `./google-id.js` não encontrado.

- [ ] **Step 3: Implementar GoogleId**

Criar `apps/backend/src/user/domain/value-object/google-id.ts`:

```typescript
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either.js"

export class InvalidGoogleIdError extends Error {
	constructor() {
		super("Google ID cannot be empty")
		this.name = "InvalidGoogleIdError"
	}
}

export class GoogleId {
	private constructor(private readonly _value: string) {}

	public static create(aString: string): Either<InvalidGoogleIdError, GoogleId> {
		if (!aString || aString.trim().length === 0) {
			return failure(new InvalidGoogleIdError())
		}
		return success(new GoogleId(aString))
	}

	public static restore(aString: string): GoogleId {
		return new GoogleId(aString)
	}

	get value(): string {
		return this._value
	}
}
```

- [ ] **Step 4: Rodar teste para verificar que passa**

```bash
pnpm --filter backend test:run -- -t "GoogleId"
```

Esperado: PASS — todos os 3 testes passam.

- [ ] **Step 5: Criar InvalidGoogleTokenError**

Criar `apps/backend/src/session/application/error/invalid-google-token-error.ts`:

```typescript
export class InvalidGoogleTokenError extends Error {
	constructor() {
		super("Invalid or expired Google token")
		this.name = "InvalidGoogleTokenError"
	}
}
```

- [ ] **Step 6: Criar GoogleEmailNotVerifiedError**

Criar `apps/backend/src/session/application/error/google-email-not-verified-error.ts`:

```typescript
export class GoogleEmailNotVerifiedError extends Error {
	constructor() {
		super("Google email is not verified")
		this.name = "GoogleEmailNotVerifiedError"
	}
}
```

- [ ] **Step 7: Registrar evento no catálogo EVENTS**

Em `apps/backend/src/shared/domain/event/events.ts`, adicionar:

```typescript
export const EVENTS = {
	USER_CREATED: "userCreated",
	PASSWORD_CHANGED: "passwordChanged",
	CHECK_IN_CREATED: "checkInCreated",
	CHECK_IN_REJECTED: "checkInRejected",
	USER_PROFILE_UPDATED: "userProfileUpdated",
	USER_ASSIGNED_BILLING_CUSTOMER_ID: "userAssignedBillingCustomerID",
	GOOGLE_ACCOUNT_LINKED: "googleAccountLinked",
} as const
```

- [ ] **Step 8: Criar GoogleAccountLinkedEvent**

Criar `apps/backend/src/user/domain/event/google-account-linked-event.ts`:

```typescript
import { DomainEvent } from "@/shared/domain/event/domain-event.js"
import { EVENTS } from "@/shared/domain/event/events.js"

export interface GoogleAccountLinkedEventProps {
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

- [ ] **Step 9: Verificar que tudo compila**

```bash
pnpm --filter backend tsc:check
```

Esperado: sem erros.

- [ ] **Step 10: Commit**

```bash
git add apps/backend/src/user/domain/value-object/google-id* apps/backend/src/session/application/error/invalid-google-token-error.ts apps/backend/src/session/application/error/google-email-not-verified-error.ts apps/backend/src/user/domain/event/google-account-linked-event.ts apps/backend/src/shared/domain/event/events.ts
git commit -m "feat(backend): add GoogleId value object, domain errors and event"
```

## Critérios de Sucesso

- GoogleId.create() aceita strings não-vazias e rejeita strings vazias
- GoogleId.restore() cria sem validação
- Erros de domínio têm `name` correto para mapeamento no BaseController
- GoogleAccountLinkedEvent está registrado no EVENTS
