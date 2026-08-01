# Task 2: Domain — `GymStatus` value object (state pattern) + erros de conflito [FR-010]

**Status:** DONE
**PRD:** `../prd/prd-gym-deactivation.md`
**Spec:** `../specs/gym-deactivation-design.md`
**Tier:** cheap
**Depends on:** N/A

## Visão Geral

Cria o value object `GymStatus` (padrão State, mirror de `UserStatus`), a factory
`GymStatusFactory`, e os dois erros de domínio `GymAlreadyDeactivatedError`/
`GymAlreadyActivatedError`. Diferente de `UserStatus` (que faz no-op silencioso ao transicionar
para o mesmo estado), `GymStatus.activate()`/`deactivate()` retornam
`Either<ConflictError, void>` — uma transição redundante (desativar já desativada, ativar já
ativa) é um erro de conflito explícito, nunca um no-op silencioso (Decisão D3 da spec).

`GymStatus._changeStatus` referencia um método `Gym._changeStatus` que ainda não existe na
entidade `Gym` (ele é adicionado na Task 3). Isso é código TypeScript válido mesmo assim,
porque o método é chamado sobre a instância `this.gym: Gym` já existente — o compilador só
reclamará se o método realmente não existir em `Gym` no momento da checagem de tipos desta
task. Como a Task 3 depende desta Task 2 (nunca o contrário), quando a Task 3 rodar, este
arquivo já existirá e o método `_changeStatus` será adicionado à classe `Gym` naquele momento,
fechando a dependência circular de forma segura pela ordem das waves.

## Arquivos

- Create: `apps/backend/src/gym/domain/value-object/gym-status.ts`
- Create: `apps/backend/src/gym/domain/error/gym-already-deactivated-error.ts`
- Create: `apps/backend/src/gym/domain/error/gym-already-activated-error.ts`
- Test: `apps/backend/src/gym/domain/value-object/gym-status.test.ts`

### Conformidade com as Skills Padrão

- `typescript-advanced`: o value object usa union types (`GymStatusTypes`), classes abstratas
  e o padrão State com uma factory tipada — modelagem de tipos avançada de TypeScript.
- `vitest`: escrita da suíte `gym-status.test.ts` seguindo os matchers e a convenção de
  `describe`/`test` já usados no bounded context `gym` (ex.: `CNPJ.test.ts`).
- `no-workarounds`: `activate()`/`deactivate()` devem retornar `Either<ConflictError, void>`
  de verdade (nunca lançar exceção nem retornar `undefined`/`boolean` como atalho) — seguindo
  o padrão `Either` já estabelecido no projeto para erros de domínio esperados.

## Passos

- **Step 1: Escrever o teste que falha**

```typescript
import { describe, expect, test } from "vitest"
import { GymAlreadyActivatedError } from "../error/gym-already-activated-error"
import { GymAlreadyDeactivatedError } from "../error/gym-already-deactivated-error"
import { GymStatusFactory } from "./gym-status"

describe("GymStatus", () => {
	test("uma academia com status ativado tem type 'activated'", () => {
		const gym = { _changeStatus: () => undefined } as unknown as Parameters<
			typeof GymStatusFactory.create
		>[0]
		const status = GymStatusFactory.create(gym, "activated")
		expect(status.type).toBe("activated")
	})

	test("deactivate() em status ativado retorna sucesso e muda o gym para 'deactivated'", () => {
		let changedTo: string | undefined
		const gym = {
			_changeStatus(newStatus: { type: string }) {
				changedTo = newStatus.type
			},
		} as unknown as Parameters<typeof GymStatusFactory.create>[0]
		const status = GymStatusFactory.create(gym, "activated")
		const result = status.deactivate()
		expect(result.isSuccess()).toBe(true)
		expect(changedTo).toBe("deactivated")
	})

	test("deactivate() em status já desativado retorna failure(GymAlreadyDeactivatedError)", () => {
		const gym = { _changeStatus: () => undefined } as unknown as Parameters<
			typeof GymStatusFactory.create
		>[0]
		const status = GymStatusFactory.create(gym, "deactivated")
		const result = status.deactivate()
		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toBeInstanceOf(GymAlreadyDeactivatedError)
	})

	test("activate() em status desativado retorna sucesso e muda o gym para 'activated'", () => {
		let changedTo: string | undefined
		const gym = {
			_changeStatus(newStatus: { type: string }) {
				changedTo = newStatus.type
			},
		} as unknown as Parameters<typeof GymStatusFactory.create>[0]
		const status = GymStatusFactory.create(gym, "deactivated")
		const result = status.activate()
		expect(result.isSuccess()).toBe(true)
		expect(changedTo).toBe("activated")
	})

	test("activate() em status já ativado retorna failure(GymAlreadyActivatedError)", () => {
		const gym = { _changeStatus: () => undefined } as unknown as Parameters<
			typeof GymStatusFactory.create
		>[0]
		const status = GymStatusFactory.create(gym, "activated")
		const result = status.activate()
		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toBeInstanceOf(GymAlreadyActivatedError)
	})
})
```

- **Step 2: Rodar o teste e confirmar que falha**

Run: `pnpm --filter backend test:run -- -t "GymStatus"`
Expected: FAIL — `Cannot find module './gym-status'` (o arquivo ainda não existe).

- **Step 3: Implementação mínima**

`apps/backend/src/gym/domain/error/gym-already-deactivated-error.ts`:
```typescript
import { DomainError } from "@/shared/domain/error/domain-error.js"

export class GymAlreadyDeactivatedError extends DomainError {
	public readonly kind = "conflict" as const

	constructor(errorOptions?: ErrorOptions) {
		super("Gym is already deactivated", errorOptions)
		this.name = "GymAlreadyDeactivatedError"
	}
}
```

`apps/backend/src/gym/domain/error/gym-already-activated-error.ts`:
```typescript
import { DomainError } from "@/shared/domain/error/domain-error.js"

export class GymAlreadyActivatedError extends DomainError {
	public readonly kind = "conflict" as const

	constructor(errorOptions?: ErrorOptions) {
		super("Gym is already activated", errorOptions)
		this.name = "GymAlreadyActivatedError"
	}
}
```

`apps/backend/src/gym/domain/value-object/gym-status.ts`:
```typescript
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import { GymAlreadyActivatedError } from "../error/gym-already-activated-error"
import { GymAlreadyDeactivatedError } from "../error/gym-already-deactivated-error"
import type { Gym } from "../gym"

export const GymStatusTypes = {
	ACTIVATED: "activated",
	DEACTIVATED: "deactivated",
} as const

export type GymStatusTypes = (typeof GymStatusTypes)[keyof typeof GymStatusTypes]

export abstract class GymStatus {
	abstract readonly type: GymStatusTypes
	constructor(protected readonly gym: Gym) {}

	abstract activate(): Either<GymAlreadyActivatedError, void>
	abstract deactivate(): Either<GymAlreadyDeactivatedError, void>
}

class ActivatedStatus extends GymStatus {
	readonly type: GymStatusTypes = "activated"

	public activate(): Either<GymAlreadyActivatedError, void> {
		return failure(new GymAlreadyActivatedError())
	}

	public deactivate(): Either<GymAlreadyDeactivatedError, void> {
		const gymStatus = GymStatusFactory.create(this.gym, "deactivated")
		this.gym._changeStatus(gymStatus)
		return success(undefined)
	}
}

class DeactivatedStatus extends GymStatus {
	readonly type: GymStatusTypes = "deactivated"

	public activate(): Either<GymAlreadyActivatedError, void> {
		const gymStatus = GymStatusFactory.create(this.gym, "activated")
		this.gym._changeStatus(gymStatus)
		return success(undefined)
	}

	public deactivate(): Either<GymAlreadyDeactivatedError, void> {
		return failure(new GymAlreadyDeactivatedError())
	}
}

export class GymStatusFactory {
	static create(gym: Gym, statusType: GymStatusTypes): GymStatus {
		switch (statusType) {
			case "activated":
				return new ActivatedStatus(gym)
			case "deactivated":
				return new DeactivatedStatus(gym)
			default:
				return new ActivatedStatus(gym)
		}
	}
}
```

- **Step 4: Rodar o teste e confirmar que passa**

Run: `pnpm --filter backend test:run -- -t "GymStatus"`
Expected: PASS — todos os 5 casos de teste passam.

- **Step 5: Commit**

```bash
git add apps/backend/src/gym/domain/value-object/gym-status.ts \
  apps/backend/src/gym/domain/value-object/gym-status.test.ts \
  apps/backend/src/gym/domain/error/gym-already-deactivated-error.ts \
  apps/backend/src/gym/domain/error/gym-already-activated-error.ts
git commit -m "feat(gym): add GymStatus value object and conflict errors"
```

## Critérios de Sucesso

- `GymStatus`/`GymStatusFactory` seguem exatamente o padrão State já usado em
  `UserStatus`/`UserStatusFactory`, com `type: GymStatusTypes` e uma factory que cria a
  subclasse correta (FR-010).
- `activate()`/`deactivate()` retornam `Either<ConflictError, void>` (nunca `void` puro) —
  transição redundante retorna `failure` com o erro de conflito apropriado, sem lançar
  exceção (Decisão D3).
- `GymAlreadyDeactivatedError`/`GymAlreadyActivatedError` estendem `DomainError` com
  `kind: "conflict"`, mapeando para HTTP 409 via `STATUS_BY_ERROR_KIND` já existente, sem
  necessidade de alterar `error-kind-status.ts`.
- `pnpm --filter backend test:run -- -t "GymStatus"` passa com os 5 casos mínimos descritos
  no Step 1.
