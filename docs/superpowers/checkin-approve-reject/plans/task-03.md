# Task 3: Refatorar entidade CheckIn + testes de unidade [RF-005, RF-006, RF-007, RF-008]

**Status:** PENDING
**PRD:** `../prd/prd-checkin-approve-reject.md`
**Spec:** `../specs/checkin-approve-reject-design.md`

## Visão Geral

Refatorar a entidade `CheckIn` para usar o padrão Status (Task 2). Remove `_isValidated: boolean`, adiciona `_status: CheckInStatus` e `_rejectedAt?: Date`. Expõe métodos internos usados pelo Status. Atualiza os testes de unidade com os novos cenários de invariância.

**Depende de:** Task 1, Task 2

## Arquivos

- Modify: `apps/backend/src/check-in/domain/check-in.ts`
- Modify: `apps/backend/src/check-in/domain/check-in.test.ts`

## Passos

- [ ] **Step 1: Reescrever check-in.ts**

Substituir o conteúdo completo de `apps/backend/src/check-in/domain/check-in.ts`:

```typescript
import type { Optional } from "@/@types/optional"
import type { CheckInAlreadyRejectedError } from "@/check-in/domain/error/check-in-already-rejected-error.js"
import type { CheckInTimeExceededError } from "@/check-in/domain/error/check-in-time-exceeded-error.js"
import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import { ExistingId } from "@/shared/domain/value-object/existing-id"
import { Id } from "@/shared/domain/value-object/id"
import { env } from "@/shared/infra/env"

import { CheckInCreatedEvent } from "./event/check-in-created-event"
import {
	type CheckInStatus,
	CheckInStatusFactory,
	type CheckInStatusTypes,
} from "./value-object/check-in-status"

interface CheckInProps {
	id: Id
	userId: ExistingId
	gymId: ExistingId
	createdAt: Date
	validatedAt?: Date
	rejectedAt?: Date
	userLatitude: number
	userLongitude: number
}

export type CheckInCreateProps = Omit<
	Optional<CheckInProps, "id" | "createdAt">,
	"id" | "userId" | "gymId" | "rejectedAt"
> & {
	id?: string
	userId: string
	gymId: string
}

export type CheckInRestoreProps = {
	id: string
	userId: string
	gymId: string
	createdAt: Date
	validatedAt?: Date
	rejectedAt?: Date
	userLatitude: number
	userLongitude: number
}

export class CheckIn {
	private readonly _id: Id
	private readonly _userId: ExistingId
	private readonly _gymId: ExistingId
	private readonly _createdAt: Date
	private readonly _latitude: number
	private readonly _longitude: number
	private _validatedAt?: Date
	private _rejectedAt?: Date
	private _status: CheckInStatus

	private constructor(props: CheckInProps) {
		this._id = props.id
		this._userId = props.userId
		this._gymId = props.gymId
		this._createdAt = props.createdAt
		this._validatedAt = props.validatedAt
		this._rejectedAt = props.rejectedAt
		this._latitude = props.userLatitude
		this._longitude = props.userLongitude

		const statusType: CheckInStatusTypes = props.rejectedAt
			? "rejected"
			: props.validatedAt
				? "validated"
				: "pending"
		this._status = CheckInStatusFactory.create(this, statusType)
	}

	public static create(props: CheckInCreateProps): CheckIn {
		const id = Id.create(props.id)
		const userId = ExistingId.restore(props.userId)
		const gymId = ExistingId.restore(props.gymId)
		const createdAt = new Date()
		const checkIn = new CheckIn({
			id,
			userId,
			gymId,
			createdAt,
			userLatitude: props.userLatitude,
			userLongitude: props.userLongitude,
		})
		DomainEventPublisher.instance.publish(
			CheckIn.createCheckInCreatedEvent(checkIn),
		)
		return checkIn
	}

	private static createCheckInCreatedEvent(
		checkIn: CheckIn,
	): CheckInCreatedEvent {
		return new CheckInCreatedEvent({
			checkInId: checkIn.id,
			userId: checkIn.userId,
			gymId: checkIn.gymId,
		})
	}

	public static restore(props: CheckInRestoreProps): CheckIn {
		return new CheckIn({
			id: Id.create(props.id),
			userId: ExistingId.restore(props.userId),
			gymId: ExistingId.restore(props.gymId),
			createdAt: props.createdAt,
			validatedAt: props.validatedAt,
			rejectedAt: props.rejectedAt,
			userLatitude: props.userLatitude,
			userLongitude: props.userLongitude,
		})
	}

	// ── Getters ─────────────────────────────────────────────────

	get id(): string {
		return this._id.value
	}

	get userId(): string {
		return this._userId.value
	}

	get gymId(): string {
		return this._gymId.value
	}

	get createdAt(): Date {
		return this._createdAt
	}

	get validatedAt(): Date | undefined {
		return this._validatedAt
	}

	get rejectedAt(): Date | undefined {
		return this._rejectedAt
	}

	get status(): CheckInStatusTypes {
		return this._status.type
	}

	get latitude(): number {
		return this._latitude
	}

	get longitude(): number {
		return this._longitude
	}

	// ── Public domain methods ────────────────────────────────────

	public validate(): Either<
		CheckInTimeExceededError | CheckInAlreadyRejectedError,
		true
	> {
		return this._status.validate()
	}

	public reject(): Either<never, true> {
		return this._status.reject()
	}

	// ── Internal methods (called by CheckInStatus) ───────────────

	/** @internal used by CheckInStatus */
	public _isNotEligibleToValidate(): boolean {
		const now = new Date()
		const differenceInMilliseconds = now.getTime() - this._createdAt.getTime()
		const differenceInMinutes = differenceInMilliseconds / 1000 / 60
		return differenceInMinutes > env.CHECK_IN_EXPIRATION_TIME
	}

	/** @internal used by CheckInStatus */
	public _changeStatus(status: CheckInStatus): void {
		this._status = status
	}

	/** @internal used by CheckInStatus */
	public _setValidatedAt(date: Date): void {
		this._validatedAt = date
	}

	/** @internal used by CheckInStatus */
	public _clearValidatedAt(): void {
		this._validatedAt = undefined
	}

	/** @internal used by CheckInStatus */
	public _setRejectedAt(date: Date): void {
		this._rejectedAt = date
	}
}
```

- [ ] **Step 2: Reescrever check-in.test.ts com todos os cenários incluindo invariância**

Substituir o conteúdo completo de `apps/backend/src/check-in/domain/check-in.test.ts`:

```typescript
import { CheckInAlreadyRejectedError } from "@/check-in/domain/error/check-in-already-rejected-error"
import { CheckInTimeExceededError } from "@/check-in/domain/error/check-in-time-exceeded-error"

import {
	CheckIn,
	type CheckInCreateProps,
	type CheckInRestoreProps,
} from "./check-in"

describe("CheckIn Entity", () => {
	describe("create", () => {
		test("Deve criar um check-in pendente", () => {
			const input: CheckInCreateProps = {
				id: "any_id",
				userId: "any_user_id",
				gymId: "any_gym_id",
				userLatitude: 0,
				userLongitude: 10,
			}
			const checkIn = CheckIn.create(input)
			expect(checkIn.id).toEqual("any_id")
			expect(checkIn.userId).toEqual("any_user_id")
			expect(checkIn.gymId).toEqual("any_gym_id")
			expect(checkIn.createdAt).toEqual(expect.any(Date))
			expect(checkIn.validatedAt).toBeUndefined()
			expect(checkIn.rejectedAt).toBeUndefined()
			expect(checkIn.status).toEqual("pending")
			expect(checkIn.latitude).toEqual(0)
			expect(checkIn.longitude).toEqual(10)
		})
	})

	describe("restore", () => {
		test("Deve restaurar um CheckIn validado", () => {
			const input: CheckInRestoreProps = {
				id: "any_id",
				userId: "any_user_id",
				gymId: "any_gym_id",
				createdAt: new Date(),
				validatedAt: new Date(),
				userLatitude: 0,
				userLongitude: 0,
			}
			const checkIn = CheckIn.restore(input)
			expect(checkIn).toBeInstanceOf(CheckIn)
			expect(checkIn.status).toEqual("validated")
			expect(checkIn.validatedAt).toEqual(input.validatedAt)
			expect(checkIn.rejectedAt).toBeUndefined()
		})

		test("Deve restaurar um CheckIn rejeitado", () => {
			const input: CheckInRestoreProps = {
				id: "any_id",
				userId: "any_user_id",
				gymId: "any_gym_id",
				createdAt: new Date(),
				rejectedAt: new Date(),
				userLatitude: 0,
				userLongitude: 0,
			}
			const checkIn = CheckIn.restore(input)
			expect(checkIn.status).toEqual("rejected")
			expect(checkIn.rejectedAt).toEqual(input.rejectedAt)
			expect(checkIn.validatedAt).toBeUndefined()
		})

		test("Deve restaurar um CheckIn pendente", () => {
			const input: CheckInRestoreProps = {
				id: "any_id",
				userId: "any_user_id",
				gymId: "any_gym_id",
				createdAt: new Date(),
				userLatitude: 0,
				userLongitude: 0,
			}
			const checkIn = CheckIn.restore(input)
			expect(checkIn.status).toEqual("pending")
			expect(checkIn.validatedAt).toBeUndefined()
			expect(checkIn.rejectedAt).toBeUndefined()
		})
	})

	describe("validate", () => {
		test("Deve validar um check-in pendente", () => {
			vi.useFakeTimers()
			vi.setSystemTime(new Date("2021-01-01"))
			const checkIn = CheckIn.create({
				id: "any_id",
				userId: "any_user_id",
				gymId: "any_gym_id",
				userLatitude: 0,
				userLongitude: 10,
			})
			const result = checkIn.validate()
			expect(result.isSuccess()).toBe(true)
			expect(checkIn.status).toEqual("validated")
			expect(checkIn.validatedAt).toBeInstanceOf(Date)
			expect(checkIn.rejectedAt).toBeUndefined()
			vi.useRealTimers()
		})

		test("Não deve validar um check-in após o tempo limite", () => {
			vi.useFakeTimers()
			const checkIn = CheckIn.create({
				id: "any_id",
				userId: "any_user_id",
				gymId: "any_gym_id",
				userLatitude: 0,
				userLongitude: 10,
			})
			vi.advanceTimersByTime(1000 * 60 * 21)
			const result = checkIn.validate()
			expect(checkIn.status).toEqual("pending")
			expect(result.forceFailure().value).toBeInstanceOf(CheckInTimeExceededError)
			vi.useRealTimers()
		})

		test("Não deve validar um check-in rejeitado", () => {
			const checkIn = CheckIn.create({
				id: "any_id",
				userId: "any_user_id",
				gymId: "any_gym_id",
				userLatitude: 0,
				userLongitude: 10,
			})
			checkIn.reject()
			const result = checkIn.validate()
			expect(result.isFailure()).toBe(true)
			expect(result.forceFailure().value).toBeInstanceOf(CheckInAlreadyRejectedError)
			expect(checkIn.status).toEqual("rejected")
		})

		test("Validar um check-in já validado é idempotente", () => {
			vi.useFakeTimers()
			vi.setSystemTime(new Date("2021-01-01"))
			const checkIn = CheckIn.create({
				id: "any_id",
				userId: "any_user_id",
				gymId: "any_gym_id",
				userLatitude: 0,
				userLongitude: 10,
			})
			checkIn.validate()
			const result = checkIn.validate()
			expect(result.isSuccess()).toBe(true)
			expect(checkIn.status).toEqual("validated")
			vi.useRealTimers()
		})
	})

	describe("reject", () => {
		test("Deve rejeitar um check-in pendente", () => {
			const checkIn = CheckIn.create({
				id: "any_id",
				userId: "any_user_id",
				gymId: "any_gym_id",
				userLatitude: 0,
				userLongitude: 10,
			})
			const result = checkIn.reject()
			expect(result.isSuccess()).toBe(true)
			expect(checkIn.status).toEqual("rejected")
			expect(checkIn.rejectedAt).toBeInstanceOf(Date)
			expect(checkIn.validatedAt).toBeUndefined()
		})

		test("Deve rejeitar um check-in validado (reversão)", () => {
			vi.useFakeTimers()
			vi.setSystemTime(new Date("2021-01-01"))
			const checkIn = CheckIn.create({
				id: "any_id",
				userId: "any_user_id",
				gymId: "any_gym_id",
				userLatitude: 0,
				userLongitude: 10,
			})
			checkIn.validate()
			expect(checkIn.status).toEqual("validated")
			expect(checkIn.validatedAt).toBeDefined()

			const result = checkIn.reject()
			expect(result.isSuccess()).toBe(true)
			expect(checkIn.status).toEqual("rejected")
			expect(checkIn.rejectedAt).toBeInstanceOf(Date)
			expect(checkIn.validatedAt).toBeUndefined()
			vi.useRealTimers()
		})

		test("Rejeitar um check-in já rejeitado é idempotente", () => {
			const checkIn = CheckIn.create({
				id: "any_id",
				userId: "any_user_id",
				gymId: "any_gym_id",
				userLatitude: 0,
				userLongitude: 10,
			})
			checkIn.reject()
			const rejectedAt = checkIn.rejectedAt
			const result = checkIn.reject()
			expect(result.isSuccess()).toBe(true)
			expect(checkIn.status).toEqual("rejected")
			expect(checkIn.rejectedAt).toEqual(rejectedAt)
		})
	})

	describe("invariante: validatedAt e rejectedAt nunca coexistem", () => {
		test("Após rejeitar pendente: apenas rejectedAt está setado", () => {
			const checkIn = CheckIn.create({
				id: "any_id",
				userId: "any_user_id",
				gymId: "any_gym_id",
				userLatitude: 0,
				userLongitude: 10,
			})
			checkIn.reject()
			expect(checkIn.validatedAt).toBeUndefined()
			expect(checkIn.rejectedAt).toBeDefined()
		})

		test("Após validar pendente: apenas validatedAt está setado", () => {
			vi.useFakeTimers()
			vi.setSystemTime(new Date("2021-01-01"))
			const checkIn = CheckIn.create({
				id: "any_id",
				userId: "any_user_id",
				gymId: "any_gym_id",
				userLatitude: 0,
				userLongitude: 10,
			})
			checkIn.validate()
			expect(checkIn.validatedAt).toBeDefined()
			expect(checkIn.rejectedAt).toBeUndefined()
			vi.useRealTimers()
		})

		test("Após rejeitar validado: validatedAt é limpo, apenas rejectedAt está setado", () => {
			vi.useFakeTimers()
			vi.setSystemTime(new Date("2021-01-01"))
			const checkIn = CheckIn.create({
				id: "any_id",
				userId: "any_user_id",
				gymId: "any_gym_id",
				userLatitude: 0,
				userLongitude: 10,
			})
			checkIn.validate()
			checkIn.reject()
			expect(checkIn.validatedAt).toBeUndefined()
			expect(checkIn.rejectedAt).toBeDefined()
			vi.useRealTimers()
		})
	})
})
```

- [ ] **Step 3: Rodar apenas os testes da entidade**

```bash
pnpm --filter backend test:run -- --reporter=verbose src/check-in/domain/check-in.test.ts
```

Esperado: todos os testes do arquivo passam.

- [ ] **Step 4: Rodar todos os testes para verificar regressões**

```bash
pnpm --filter backend test:run
```

Esperado: todos os testes passam. Se `validate-check-in.usecase.test.ts` falhar por causa de `isValidated`, ver Step 5.

- [ ] **Step 5: Corrigir referências a `isValidated` em outros arquivos se necessário**

Se outros arquivos usam `checkIn.isValidated`, atualizar para `checkIn.status === "validated"`.

Verificar:
```bash
grep -r "isValidated" apps/backend/src --include="*.ts" -l
```

Para cada ocorrência, substituir `checkIn.isValidated` por `checkIn.status === "validated"`.

- [ ] **Step 6: Rodar type-check**

```bash
pnpm --filter backend tsc:check
```

Esperado: 0 erros.

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/check-in/domain/check-in.ts \
        apps/backend/src/check-in/domain/check-in.test.ts
git commit -m "feat(check-in): refactor CheckIn entity with Status pattern and add reject()

- Remove _isValidated, add _status: CheckInStatus
- Add rejectedAt field
- Validate and reject delegate to status object
- Add internal methods for CheckInStatus to call
- Add comprehensive unit tests for state invariants
```

## Critérios de Sucesso

- `checkIn.status` retorna `"pending"` | `"validated"` | `"rejected"` corretamente
- `reject()` em pending: `status = "rejected"`, `rejectedAt` definido, `validatedAt` = undefined
- `reject()` em validated: `status = "rejected"`, `rejectedAt` definido, `validatedAt` limpo
- `validate()` em rejected: retorna `failure(CheckInAlreadyRejectedError)`
- `reject()` em rejected: idempotente
- 0 erros de TypeScript
- Todos os testes existentes continuam passando
