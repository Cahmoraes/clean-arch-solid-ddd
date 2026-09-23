# Task 1: Entidade de domínio `Plan` [FR-001, FR-002, FR-003, FR-008]

**Status:** DONE
**PRD:** `../prd/prd-plans-catalog-admin.md`
**Spec:** `../specs/plans-catalog-admin-design.md`
**Tier:** standard
**Depends on:** N/A

## Visão Geral

Cria a entidade de domínio `Plan` do bounded context `subscription`, que substitui o array
estático `DEMO_PLANS`. `Plan` guarda preço estruturado (`priceCents` + `billingPeriod`, Decisão
D2 da spec) em vez de um texto pronto, valida que o preço nunca é negativo (FR-002, `priceCents:
0` é um plano gratuito válido) e que o nome é obrigatório (FR-003). Não existe nenhum método de
exclusão física (FR-008, Decisão D4) — a única forma de desativar um plano é `inactivate()`, que
devolve uma nova instância com `isActive: false`, nunca remove o registro.

## Arquivos

- Create: `apps/backend/src/subscription/domain/plan.ts`
- Create: `apps/backend/src/subscription/domain/error/invalid-plan-name-error.ts`
- Create: `apps/backend/src/subscription/domain/error/invalid-price-error.ts`
- Test: `apps/backend/src/subscription/domain/plan.test.ts`

## Interfaces

- **Consome:** N/A
- **Produz:** `BILLING_PERIODS = ["monthly", "yearly"] as const`, `type BillingPeriod =
  (typeof BILLING_PERIODS)[number]` — de `plan.ts`. `Plan.create(props: PlanCreateProps):
  Either<InvalidPlanNameError | InvalidPriceError, Plan>` onde `PlanCreateProps = { id?: string;
  name: string; priceCents: number; billingPeriod: BillingPeriod; tagline: string; features:
  ReadonlyArray<string>; stripePriceId?: string }`. `Plan.restore(props: PlanRestoreProps): Plan`
  onde `PlanRestoreProps` é igual a `PlanCreateProps` mas com `id`, `isActive: boolean` e
  `stripePriceId: string` obrigatórios (sem validação, usado para reidratar do banco). Getters de
  instância: `id, name, priceCents, billingPeriod, tagline, features, isActive, stripePriceId`
  (todos `readonly`, sem setters). Métodos de instância `inactivate(): Plan` e `reactivate(): Plan`
  — cada um retorna uma **nova** instância de `Plan` com `isActive` alternado, preservando os
  demais campos; `Plan` não expõe nenhum método `delete`/`remove`. `InvalidPlanNameError` (kind
  `"validation"`, `apps/backend/src/subscription/domain/error/invalid-plan-name-error.ts`) e
  `InvalidPriceError` (kind `"validation"`,
  `apps/backend/src/subscription/domain/error/invalid-price-error.ts`) — ambas estendem
  `DomainError` de `@/shared/domain/error/domain-error.js`.

### Conformidade com as Skills Padrão

- Nenhuma skill de domínio de frontend aplicável — task de domínio puro backend, sem UI; segue
  apenas as convenções descritas em `apps/backend/AGENTS.md` (padrão de entidade/Value Object,
  `Either`, erros `DomainError`).

## Passos

- **Step 1: Write the failing test**

```typescript
// apps/backend/src/subscription/domain/plan.test.ts
import { describe, expect, test } from "vitest"
import { Plan } from "./plan"

const VALID_PROPS = {
	name: "Premium Mensal",
	priceCents: 4990,
	billingPeriod: "monthly" as const,
	tagline: "Acesso ilimitado a todas as academias parceiras.",
	features: ["Check-ins ilimitados", "Suporte prioritário"],
}

describe("Plan", () => {
	test("deve criar um Plan com dados válidos e isActive true por padrão", () => {
		const result = Plan.create(VALID_PROPS)

		expect(result.isSuccess()).toBe(true)
		const plan = result.forceSuccess().value
		expect(plan.name).toBe("Premium Mensal")
		expect(plan.priceCents).toBe(4990)
		expect(plan.billingPeriod).toBe("monthly")
		expect(plan.tagline).toBe(VALID_PROPS.tagline)
		expect(plan.features).toEqual(VALID_PROPS.features)
		expect(plan.isActive).toBe(true)
		expect(plan.stripePriceId).toBe("")
		expect(typeof plan.id).toBe("string")
		expect(plan.id.length).toBeGreaterThan(0)
	})
})
```

Run (from `apps/backend`): `npx vitest --run --config ./test/vite.config.app-domain.ts src/subscription/domain/plan.test.ts`
Expected: FAIL — `Cannot find module './plan'` (o arquivo `plan.ts` ainda não existe)

- **Step 2: Write minimal implementation**

```typescript
// apps/backend/src/subscription/domain/plan.ts
import { randomUUID } from "node:crypto"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"

export const BILLING_PERIODS = ["monthly", "yearly"] as const
export type BillingPeriod = (typeof BILLING_PERIODS)[number]

export interface PlanCreateProps {
	id?: string
	name: string
	priceCents: number
	billingPeriod: BillingPeriod
	tagline: string
	features: ReadonlyArray<string>
	stripePriceId?: string
}

export interface PlanRestoreProps {
	id: string
	name: string
	priceCents: number
	billingPeriod: BillingPeriod
	tagline: string
	features: ReadonlyArray<string>
	isActive: boolean
	stripePriceId: string
}

export class Plan {
	private constructor(private readonly props: PlanRestoreProps) {}

	static create(props: PlanCreateProps): Either<Error, Plan> {
		return success(
			new Plan({
				id: props.id ?? randomUUID(),
				name: props.name,
				priceCents: props.priceCents,
				billingPeriod: props.billingPeriod,
				tagline: props.tagline,
				features: props.features,
				isActive: true,
				stripePriceId: props.stripePriceId ?? "",
			}),
		)
	}

	static restore(props: PlanRestoreProps): Plan {
		return new Plan(props)
	}

	get id(): string {
		return this.props.id
	}

	get name(): string {
		return this.props.name
	}

	get priceCents(): number {
		return this.props.priceCents
	}

	get billingPeriod(): BillingPeriod {
		return this.props.billingPeriod
	}

	get tagline(): string {
		return this.props.tagline
	}

	get features(): ReadonlyArray<string> {
		return this.props.features
	}

	get isActive(): boolean {
		return this.props.isActive
	}

	get stripePriceId(): string {
		return this.props.stripePriceId
	}
}
```

Run (from `apps/backend`): `npx vitest --run --config ./test/vite.config.app-domain.ts src/subscription/domain/plan.test.ts`
Expected: PASS

- **Step 3: Write the failing test**

```typescript
// apenas o novo describe/test — adicionar ao arquivo existente
import { InvalidPlanNameError } from "./error/invalid-plan-name-error"

test("deve rejeitar nome vazio com InvalidPlanNameError", () => {
	const result = Plan.create({ ...VALID_PROPS, name: "" })

	expect(result.isFailure()).toBe(true)
	expect(result.value).toBeInstanceOf(InvalidPlanNameError)
})

test("deve rejeitar nome contendo apenas espaços com InvalidPlanNameError", () => {
	const result = Plan.create({ ...VALID_PROPS, name: "   " })

	expect(result.isFailure()).toBe(true)
	expect(result.value).toBeInstanceOf(InvalidPlanNameError)
})
```

Run (from `apps/backend`): `npx vitest --run --config ./test/vite.config.app-domain.ts src/subscription/domain/plan.test.ts`
Expected: FAIL — `Cannot find module './error/invalid-plan-name-error'`; mesmo depois de criado o
arquivo de erro, o teste continua a falhar porque `Plan.create` ainda não valida o nome (ambos os
`result.isFailure()` retornam `false`)

- **Step 4: Write minimal implementation**

```typescript
// apps/backend/src/subscription/domain/error/invalid-plan-name-error.ts
import { DomainError } from "@/shared/domain/error/domain-error.js"

export class InvalidPlanNameError extends DomainError {
	public readonly kind = "validation" as const

	constructor(errorOptions?: ErrorOptions) {
		super("Plan name is required", errorOptions)
		this.name = "InvalidPlanNameError"
	}
}
```

```typescript
// apps/backend/src/subscription/domain/plan.ts — dentro de Plan.create, antes do success()
import { InvalidPlanNameError } from "./error/invalid-plan-name-error.js"

static create(
	props: PlanCreateProps,
): Either<InvalidPlanNameError, Plan> {
	const name = props.name.trim()
	if (name.length === 0) return failure(new InvalidPlanNameError())

	return success(
		new Plan({
			id: props.id ?? randomUUID(),
			name,
			priceCents: props.priceCents,
			billingPeriod: props.billingPeriod,
			tagline: props.tagline,
			features: props.features,
			isActive: true,
			stripePriceId: props.stripePriceId ?? "",
		}),
	)
}
```

Run (from `apps/backend`): `npx vitest --run --config ./test/vite.config.app-domain.ts src/subscription/domain/plan.test.ts`
Expected: PASS

- **Step 5: Review Focus: price_cents = 0 é um plano gratuito válido e não deve ser rejeitado pela validação de preço não-negativo — Write the failing test**

```typescript
// apenas o novo describe/test — adicionar ao arquivo existente
import { InvalidPriceError } from "./error/invalid-price-error"

test("deve rejeitar priceCents negativo com InvalidPriceError", () => {
	const result = Plan.create({ ...VALID_PROPS, priceCents: -1 })

	expect(result.isFailure()).toBe(true)
	expect(result.value).toBeInstanceOf(InvalidPriceError)
})

test("priceCents igual a 0 é um plano gratuito válido, não deve ser rejeitado", () => {
	const result = Plan.create({ ...VALID_PROPS, priceCents: 0 })

	expect(result.isSuccess()).toBe(true)
	expect(result.forceSuccess().value.priceCents).toBe(0)
})
```

Run (from `apps/backend`): `npx vitest --run --config ./test/vite.config.app-domain.ts src/subscription/domain/plan.test.ts`
Expected: FAIL — `Cannot find module './error/invalid-price-error'`; mesmo após criado o arquivo
de erro, o primeiro teste (`priceCents: -1`) falha porque `Plan.create` ainda aceita preços
negativos (`result.isFailure()` retorna `false`)

- **Step 6: Write minimal implementation**

```typescript
// apps/backend/src/subscription/domain/error/invalid-price-error.ts
import { DomainError } from "@/shared/domain/error/domain-error.js"

export class InvalidPriceError extends DomainError {
	public readonly kind = "validation" as const

	constructor(errorOptions?: ErrorOptions) {
		super("Plan price cannot be negative", errorOptions)
		this.name = "InvalidPriceError"
	}
}
```

```typescript
// apps/backend/src/subscription/domain/plan.ts — dentro de Plan.create, após a validação de nome
import { InvalidPriceError } from "./error/invalid-price-error.js"

static create(
	props: PlanCreateProps,
): Either<InvalidPlanNameError | InvalidPriceError, Plan> {
	const name = props.name.trim()
	if (name.length === 0) return failure(new InvalidPlanNameError())
	if (props.priceCents < 0) return failure(new InvalidPriceError())

	return success(
		new Plan({
			id: props.id ?? randomUUID(),
			name,
			priceCents: props.priceCents,
			billingPeriod: props.billingPeriod,
			tagline: props.tagline,
			features: props.features,
			isActive: true,
			stripePriceId: props.stripePriceId ?? "",
		}),
	)
}
```

Note: `props.priceCents < 0` rejeita apenas valores negativos — `0` passa pela validação e chega
ao `success()`, satisfazendo o Review Focus.

Run (from `apps/backend`): `npx vitest --run --config ./test/vite.config.app-domain.ts src/subscription/domain/plan.test.ts`
Expected: PASS

- **Step 7: Write the failing test**

```typescript
// apenas o novo describe/test — adicionar ao arquivo existente
test("inactivate() retorna uma nova instância com isActive false, preservando os demais campos", () => {
	const plan = Plan.create(VALID_PROPS).forceSuccess().value

	const inactivated = plan.inactivate()

	expect(inactivated).not.toBe(plan)
	expect(inactivated.isActive).toBe(false)
	expect(plan.isActive).toBe(true)
	expect(inactivated.name).toBe(plan.name)
	expect(inactivated.id).toBe(plan.id)
})

test("reactivate() retorna uma nova instância com isActive true", () => {
	const plan = Plan.create(VALID_PROPS).forceSuccess().value
	const inactivated = plan.inactivate()

	const reactivated = inactivated.reactivate()

	expect(reactivated).not.toBe(inactivated)
	expect(reactivated.isActive).toBe(true)
})
```

Run (from `apps/backend`): `npx vitest --run --config ./test/vite.config.app-domain.ts src/subscription/domain/plan.test.ts`
Expected: FAIL — `plan.inactivate is not a function`

- **Step 8: Write minimal implementation**

```typescript
// apps/backend/src/subscription/domain/plan.ts — métodos de instância, após os getters
public inactivate(): Plan {
	return new Plan({ ...this.props, isActive: false })
}

public reactivate(): Plan {
	return new Plan({ ...this.props, isActive: true })
}
```

Run (from `apps/backend`): `npx vitest --run --config ./test/vite.config.app-domain.ts src/subscription/domain/plan.test.ts`
Expected: PASS

- **Step 9: Commit** *(apenas quando `workflow.auto_commit` for `true` — o prompt do
  implementador informa; caso contrário, pular este passo e reportar os arquivos)*

```bash
git add apps/backend/src/subscription/domain/plan.ts \
  apps/backend/src/subscription/domain/error/invalid-plan-name-error.ts \
  apps/backend/src/subscription/domain/error/invalid-price-error.ts \
  apps/backend/src/subscription/domain/plan.test.ts
git commit -m "feat(subscription): add Plan domain entity"
```

## Critérios de Sucesso

- `Plan.create` com dados válidos retorna `success` com `isActive: true` e `stripePriceId: ""`
  por padrão (FR-001).
- `Plan.create` com `priceCents` negativo retorna `failure(InvalidPriceError)`; com `priceCents:
  0` retorna `success` — plano gratuito é um estado válido (FR-002).
- `Plan.create` com nome vazio ou só espaços retorna `failure(InvalidPlanNameError)` (FR-003).
- `Plan` não expõe nenhum método de exclusão física — a única forma de mudar disponibilidade é
  `inactivate()`/`reactivate()`, que retornam uma nova instância sem apagar dados (FR-008).
