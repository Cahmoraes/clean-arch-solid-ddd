# Task 2: Value Object CheckInStatus (padrão Status) [RF-005, RF-006, RF-007, RF-008]

**Status:** PENDING
**PRD:** `../prd/prd-checkin-approve-reject.md`
**Spec:** `../specs/checkin-approve-reject-design.md`

## Visão Geral

Criar o value object `CheckInStatus` seguindo exatamente o mesmo padrão do `UserStatus` em `user/domain/value-object/status.ts`. Encapsula as três transições de estado do check-in, garantindo invariância mútua entre `validatedAt` e `rejectedAt`.

**Depende de:** Task 1 (CheckInAlreadyRejectedError, CheckInRejectedEvent)

## Arquivos

- Create: `apps/backend/src/check-in/domain/value-object/check-in-status.ts`

## Passos

- [ ] **Step 1: Criar check-in-status.ts com o padrão Status completo**

```typescript
// apps/backend/src/check-in/domain/value-object/check-in-status.ts
import type { CheckInAlreadyRejectedError } from "@/check-in/domain/error/check-in-already-rejected-error.js"
import type { CheckInTimeExceededError } from "@/check-in/domain/error/check-in-time-exceeded-error.js"
import type { CheckInRejectedEvent } from "@/check-in/domain/event/check-in-rejected-event.js"
import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher.js"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either.js"
import type { CheckIn } from "../check-in.js"
import { CheckInAlreadyRejectedError as CheckInAlreadyRejectedErrorImpl } from "../error/check-in-already-rejected-error.js"
import { CheckInRejectedEvent as CheckInRejectedEventImpl } from "../event/check-in-rejected-event.js"
import { CheckInTimeExceededError as CheckInTimeExceededErrorImpl } from "../error/check-in-time-exceeded-error.js"

export const CheckInStatusTypes = {
	PENDING: "pending",
	VALIDATED: "validated",
	REJECTED: "rejected",
} as const

export type CheckInStatusTypes =
	(typeof CheckInStatusTypes)[keyof typeof CheckInStatusTypes]

export abstract class CheckInStatus {
	abstract readonly type: CheckInStatusTypes

	constructor(protected readonly checkIn: CheckIn) {}

	abstract validate(): Either<
		CheckInTimeExceededError | CheckInAlreadyRejectedError,
		true
	>
	abstract reject(): Either<never, true>
}

class PendingStatus extends CheckInStatus {
	readonly type = CheckInStatusTypes.PENDING

	public validate(): Either<CheckInTimeExceededError, true> {
		if (this.checkIn._isNotEligibleToValidate()) {
			return failure(new CheckInTimeExceededErrorImpl())
		}
		this.checkIn._setValidatedAt(new Date())
		this.checkIn._changeStatus(
			CheckInStatusFactory.create(this.checkIn, CheckInStatusTypes.VALIDATED),
		)
		return success(true)
	}

	public reject(): Either<never, true> {
		this.checkIn._setRejectedAt(new Date())
		this.checkIn._changeStatus(
			CheckInStatusFactory.create(this.checkIn, CheckInStatusTypes.REJECTED),
		)
		DomainEventPublisher.instance.publish(
			new CheckInRejectedEventImpl({
				checkInId: this.checkIn.id,
				userId: this.checkIn.userId,
				gymId: this.checkIn.gymId,
			}),
		)
		return success(true)
	}
}

class ValidatedStatus extends CheckInStatus {
	readonly type = CheckInStatusTypes.VALIDATED

	public validate(): Either<never, true> {
		return success(true)
	}

	public reject(): Either<never, true> {
		this.checkIn._clearValidatedAt()
		this.checkIn._setRejectedAt(new Date())
		this.checkIn._changeStatus(
			CheckInStatusFactory.create(this.checkIn, CheckInStatusTypes.REJECTED),
		)
		DomainEventPublisher.instance.publish(
			new CheckInRejectedEventImpl({
				checkInId: this.checkIn.id,
				userId: this.checkIn.userId,
				gymId: this.checkIn.gymId,
			}),
		)
		return success(true)
	}
}

class RejectedStatus extends CheckInStatus {
	readonly type = CheckInStatusTypes.REJECTED

	public validate(): Either<CheckInAlreadyRejectedError, never> {
		return failure(new CheckInAlreadyRejectedErrorImpl())
	}

	public reject(): Either<never, true> {
		return success(true)
	}
}

export class CheckInStatusFactory {
	static create(
		checkIn: CheckIn,
		statusType: CheckInStatusTypes,
	): CheckInStatus {
		switch (statusType) {
			case CheckInStatusTypes.PENDING:
				return new PendingStatus(checkIn)
			case CheckInStatusTypes.VALIDATED:
				return new ValidatedStatus(checkIn)
			case CheckInStatusTypes.REJECTED:
				return new RejectedStatus(checkIn)
			default:
				return new PendingStatus(checkIn)
		}
	}
}
```

- [ ] **Step 2: Verificar tipagem**

```bash
pnpm --filter backend tsc:check
```

Esperado: 0 erros (exceto os erros esperados na entidade CheckIn que ainda não foi atualizada — os erros serão nas referências a `_isNotEligibleToValidate`, `_setValidatedAt`, `_clearValidatedAt`, `_setRejectedAt`, `_changeStatus` que ainda não existem na entidade).

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/check-in/domain/value-object/check-in-status.ts
git commit -m "feat(check-in): add CheckInStatus value object with Status pattern
```

## Critérios de Sucesso

- `PendingStatus.validate()`: checa tempo → seta `validatedAt` → muda para `ValidatedStatus`
- `PendingStatus.reject()`: seta `rejectedAt` → muda para `RejectedStatus` → publica `CheckInRejectedEvent`
- `ValidatedStatus.validate()`: idempotente, retorna `success(true)`
- `ValidatedStatus.reject()`: limpa `validatedAt` → seta `rejectedAt` → muda para `RejectedStatus` → publica `CheckInRejectedEvent`
- `RejectedStatus.validate()`: retorna `failure(CheckInAlreadyRejectedError)`
- `RejectedStatus.reject()`: idempotente, retorna `success(true)`
