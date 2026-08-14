# Task 1: Domain events novos: LoginSucceededEvent, UserRoleChangedEvent, UserStatusChangedEvent [FR-005, FR-010, FR-011]

**Status:** DONE
**PRD:** `../prd/prd-historico-atividade-usuario.md`
**Spec:** `../specs/historico-atividade-usuario-design.md`
**Tier:** cheap
**Depends on:** N/A

## Visão Geral

Criar os 3 domain events novos que a feature de histórico de atividade precisa para representar login bem-sucedido, troca de role e troca de status: `LoginSucceededEvent` (FR-005), `UserRoleChangedEvent` (FR-010) e `UserStatusChangedEvent` (FR-011). Os 3 seguem exatamente o padrão já usado por `AccountLockedBySecurityEvent` (`apps/backend/src/user/domain/event/account-locked-by-security-event.ts`): estendem `DomainEvent<T>`, guardam o `payload` tipado e implementam `toJSON()`. Esta task também registra os 3 novos nomes de evento no objeto `EVENTS` central. Nenhuma use case publica estes eventos ainda — isso é feito nas tasks 02, 03, 06, 07, 08, 09 e 10, todas dependentes desta.

## Arquivos

- Create: `apps/backend/src/user/domain/event/login-succeeded.event.ts`
- Create: `apps/backend/src/user/domain/event/user-role-changed.event.ts`
- Create: `apps/backend/src/user/domain/event/user-status-changed.event.ts`
- Modify: `apps/backend/src/shared/domain/event/events.ts`
- Test: `apps/backend/src/user/domain/event/login-succeeded.event.test.ts`
- Test: `apps/backend/src/user/domain/event/user-role-changed.event.test.ts`
- Test: `apps/backend/src/user/domain/event/user-status-changed.event.test.ts`

### Conformidade com as Skills Padrão

- `typescript-advanced`: os 3 eventos usam o generic `DomainEvent<T>` e derivam `EventTypes` de `(typeof EVENTS)[keyof typeof EVENTS]` — a tipagem do payload de cada evento precisa casar exatamente com o `RoleTypes`/`StatusTypes` importados dos value objects existentes.
- `test-antipatterns`: os testes devem verificar o comportamento real da classe (payload, `eventName`, `id`, `date` setados por `DomainEvent`), sem mockar a própria classe sob teste.

## Passos

- **Step 1: Escrever os 3 testes falhando**

```typescript
// apps/backend/src/user/domain/event/login-succeeded.event.test.ts
import { describe, expect, test } from "vitest"
import { EVENTS } from "@/shared/domain/event/events"
import {
	LoginSucceededEvent,
	type LoginSucceededEventProps,
} from "./login-succeeded.event"

describe("LoginSucceededEvent", () => {
	test("deve criar o evento com o payload, eventName, id e date corretos", () => {
		const props: LoginSucceededEventProps = {
			userId: "user-1",
			userEmail: "john@doe.com",
			userName: "John Doe",
		}

		const event = new LoginSucceededEvent(props)

		expect(event.payload).toEqual(props)
		expect(event.eventName).toBe(EVENTS.LOGIN_SUCCEEDED)
		expect(event.id).toEqual(expect.any(String))
		expect(event.date).toBeInstanceOf(Date)
	})

	test("toJSON deve expor id, eventName, date e payload", () => {
		const event = new LoginSucceededEvent({
			userId: "user-1",
			userEmail: "john@doe.com",
			userName: "John Doe",
		})

		const json = event.toJSON()

		expect(json).toEqual({
			id: event.id,
			eventName: event.eventName,
			date: event.date,
			payload: event.payload,
		})
	})
})
```

```typescript
// apps/backend/src/user/domain/event/user-role-changed.event.test.ts
import { describe, expect, test } from "vitest"
import { EVENTS } from "@/shared/domain/event/events"
import {
	UserRoleChangedEvent,
	type UserRoleChangedEventProps,
} from "./user-role-changed.event"

describe("UserRoleChangedEvent", () => {
	test("deve criar o evento com o payload, eventName, id e date corretos", () => {
		const props: UserRoleChangedEventProps = {
			userId: "user-1",
			userEmail: "john@doe.com",
			userName: "John Doe",
			previousRole: "MEMBER",
			newRole: "ADMIN",
		}

		const event = new UserRoleChangedEvent(props)

		expect(event.payload).toEqual(props)
		expect(event.eventName).toBe(EVENTS.USER_ROLE_CHANGED)
		expect(event.id).toEqual(expect.any(String))
		expect(event.date).toBeInstanceOf(Date)
	})

	test("toJSON deve expor id, eventName, date e payload", () => {
		const event = new UserRoleChangedEvent({
			userId: "user-1",
			userEmail: "john@doe.com",
			userName: "John Doe",
			previousRole: "ADMIN",
			newRole: "MEMBER",
		})

		const json = event.toJSON()

		expect(json).toEqual({
			id: event.id,
			eventName: event.eventName,
			date: event.date,
			payload: event.payload,
		})
	})
})
```

```typescript
// apps/backend/src/user/domain/event/user-status-changed.event.test.ts
import { describe, expect, test } from "vitest"
import { EVENTS } from "@/shared/domain/event/events"
import {
	UserStatusChangedEvent,
	type UserStatusChangedEventProps,
} from "./user-status-changed.event"

describe("UserStatusChangedEvent", () => {
	test("deve criar o evento com o payload, eventName, id e date corretos", () => {
		const props: UserStatusChangedEventProps = {
			userId: "user-1",
			userEmail: "john@doe.com",
			userName: "John Doe",
			previousStatus: "activated",
			newStatus: "suspended",
		}

		const event = new UserStatusChangedEvent(props)

		expect(event.payload).toEqual(props)
		expect(event.eventName).toBe(EVENTS.USER_STATUS_CHANGED)
		expect(event.id).toEqual(expect.any(String))
		expect(event.date).toBeInstanceOf(Date)
	})

	test("toJSON deve expor id, eventName, date e payload", () => {
		const event = new UserStatusChangedEvent({
			userId: "user-1",
			userEmail: "john@doe.com",
			userName: "John Doe",
			previousStatus: "suspended",
			newStatus: "activated",
		})

		const json = event.toJSON()

		expect(json).toEqual({
			id: event.id,
			eventName: event.eventName,
			date: event.date,
			payload: event.payload,
		})
	})
})
```

- **Step 2: Rodar os testes e confirmar a falha**

Run: `npx vitest --run --config ./test/vite.config.app-domain.ts src/user/domain/event/login-succeeded.event.test.ts src/user/domain/event/user-role-changed.event.test.ts src/user/domain/event/user-status-changed.event.test.ts` (a partir de `apps/backend/`)
Expected: FAIL — `Cannot find module './login-succeeded.event'` (e os equivalentes para os outros 2 arquivos, que ainda não existem).

- **Step 3: Implementação mínima**

```typescript
// apps/backend/src/shared/domain/event/events.ts
export const EVENTS = {
	USER_CREATED: "userCreated",
	PASSWORD_CHANGED: "passwordChanged",
	PASSWORD_RESET_REQUESTED: "passwordResetRequested",
	CHECK_IN_CREATED: "checkInCreated",
	CHECK_IN_APPROVED: "checkInApproved",
	CHECK_IN_REJECTED: "checkInRejected",
	USER_PROFILE_UPDATED: "userProfileUpdated",
	USER_ASSIGNED_BILLING_CUSTOMER_ID: "userAssignedBillingCustomerID",
	GOOGLE_ACCOUNT_LINKED: "googleAccountLinked",
	ACCOUNT_LOCKED_BY_SECURITY: "accountLockedBySecurity",
	LOGIN_SUCCEEDED: "loginSucceeded",
	USER_ROLE_CHANGED: "userRoleChanged",
	USER_STATUS_CHANGED: "userStatusChanged",
} as const

export type EventTypes = (typeof EVENTS)[keyof typeof EVENTS]
```

```typescript
// apps/backend/src/user/domain/event/login-succeeded.event.ts
import { DomainEvent } from "@/shared/domain/event/domain-event"
import { EVENTS } from "@/shared/domain/event/events"

export interface LoginSucceededEventProps {
	userId: string
	userEmail: string
	userName: string
}

export class LoginSucceededEvent extends DomainEvent<LoginSucceededEventProps> {
	readonly payload: LoginSucceededEventProps

	constructor(props: LoginSucceededEventProps) {
		super(EVENTS.LOGIN_SUCCEEDED)
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

```typescript
// apps/backend/src/user/domain/event/user-role-changed.event.ts
import { DomainEvent } from "@/shared/domain/event/domain-event"
import { EVENTS } from "@/shared/domain/event/events"
import type { RoleTypes } from "@/user/domain/value-object/role"

export interface UserRoleChangedEventProps {
	userId: string
	userEmail: string
	userName: string
	previousRole: RoleTypes
	newRole: RoleTypes
}

export class UserRoleChangedEvent extends DomainEvent<UserRoleChangedEventProps> {
	readonly payload: UserRoleChangedEventProps

	constructor(props: UserRoleChangedEventProps) {
		super(EVENTS.USER_ROLE_CHANGED)
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

```typescript
// apps/backend/src/user/domain/event/user-status-changed.event.ts
import { DomainEvent } from "@/shared/domain/event/domain-event"
import { EVENTS } from "@/shared/domain/event/events"
import type { StatusTypes } from "@/user/domain/value-object/status"

export interface UserStatusChangedEventProps {
	userId: string
	userEmail: string
	userName: string
	previousStatus: StatusTypes
	newStatus: StatusTypes
}

export class UserStatusChangedEvent extends DomainEvent<UserStatusChangedEventProps> {
	readonly payload: UserStatusChangedEventProps

	constructor(props: UserStatusChangedEventProps) {
		super(EVENTS.USER_STATUS_CHANGED)
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

- **Step 4: Rodar os testes e confirmar o sucesso**

Run: `npx vitest --run --config ./test/vite.config.app-domain.ts src/user/domain/event/login-succeeded.event.test.ts src/user/domain/event/user-role-changed.event.test.ts src/user/domain/event/user-status-changed.event.test.ts` (a partir de `apps/backend/`)
Expected: PASS — 6 testes (2 por evento).

- **Step 5: Commit**

Commit pulado — orquestrador faz commit na barreira de integração da wave; reporte os arquivos alterados (esta task está na Wave 1, execução paralela).

## Critérios de Sucesso

- `EVENTS.LOGIN_SUCCEEDED === "loginSucceeded"`, `EVENTS.USER_ROLE_CHANGED === "userRoleChanged"` e `EVENTS.USER_STATUS_CHANGED === "userStatusChanged"` existem em `shared/domain/event/events.ts` (suporta FR-005, FR-010, FR-011).
- `LoginSucceededEvent`, `UserRoleChangedEvent` e `UserStatusChangedEvent` instanciam corretamente, preenchem `payload`, `eventName`, `id` e `date`, e os 6 testes novos passam.
- Nenhuma use case foi modificada nesta task — os eventos ainda não são publicados em lugar nenhum (isso fica para as tasks 02, 03, 06, 07, 08, 09, 10, que dependem desta).
