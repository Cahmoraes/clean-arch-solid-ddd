# Task 1: Domínio: campos do plano/período em Subscription, transições e erros [FR-003, FR-010, FR-012, FR-013, FR-014, FR-017]

**Status:** DONE

**PRD:** `../prd/prd-subscription-plan-link.md`

**Spec:** `../specs/subscription-plan-link-design.md`

**Tier:** capable

**Depends on:** N/A

## Visão Geral

Esta task entrega o núcleo puro do vínculo plano-assinatura: `Subscription` passa a guardar plano, período pago e cancelamento agendado, com as transições de troca de plano, agendamento de cancelamento e estado derivado (ativa, cancelamento agendado, vencida). Também cria o cálculo de fim de período com clamp de fim de mês, os três erros de domínio novos e a projeção `MySubscriptionView` (com o schema de resposta zod) que as três rotas `/subscriptions/me` compartilham. Nada aqui toca banco, gateway ou HTTP.

## Arquivos

- Create: `apps/backend/src/subscription/domain/compute-period-end.ts`
- Create: `apps/backend/src/subscription/domain/compute-period-end.test.ts`
- Create: `apps/backend/src/subscription/domain/error/active-subscription-already-exists-error.ts`
- Create: `apps/backend/src/subscription/domain/error/subscription-cancellation-scheduled-error.ts`
- Create: `apps/backend/src/subscription/domain/error/no-active-subscription-error.ts`
- Create: `apps/backend/src/subscription/domain/subscription-plan-lifecycle.test.ts`
- Create: `apps/backend/src/subscription/application/dto/my-subscription-view.ts`
- Create: `apps/backend/src/subscription/application/dto/my-subscription-view.test.ts`
- Create: `apps/backend/src/subscription/infra/controller/schema/my-subscription-response-schema.ts`
- Modify: `apps/backend/src/subscription/domain/subscription.ts`

## Interfaces

- **Consome:** N/A (não depende de nenhuma task). Usa apenas o que já existe no repositório: `BillingPeriod = "monthly" | "yearly"` e a classe `Plan` (getters `id`, `name`, `stripePriceId`, `billingPeriod`, `isActive`; `Plan.restore(props)`, `plan.inactivate()`) de `apps/backend/src/subscription/domain/plan.ts`; `DomainError` de `@/shared/domain/error/domain-error.js`.
- **Produz:**
  - `computePeriodEnd(start: Date, billingPeriod: BillingPeriod): Date` (arquivo `domain/compute-period-end.ts`; opera em UTC, clampa para o último dia do mês destino).
  - `type SubscriptionState = "active" | "cancel_scheduled" | "expired"` exportado de `domain/subscription.ts`.
  - `SubscriptionCreate` ganha `planId?: string`, `billingPeriod?: BillingPeriod` (padrão `"monthly"`), `currentPeriodStart?: Date` (padrão `createdAt`). `SubscriptionRestore` ganha `planId?: string`, `currentPeriodStart?: Date`, `currentPeriodEnd?: Date`, `cancelAtPeriodEnd?: boolean` (linha legada: início = `createdAt`, fim = `createdAt` + 1 mês, `cancelAtPeriodEnd = false`).
  - Getters de `Subscription`: `planId: string | undefined`, `currentPeriodStart: Date`, `currentPeriodEnd: Date`, `cancelAtPeriodEnd: boolean`.
  - Métodos de `Subscription`: `assertCanChangePlan(): void` (lança `SubscriptionCancellationScheduledError` se `cancelAtPeriodEnd`), `changePlan(planId: string, now?: Date): void`, `scheduleCancellation(now?: Date): void` (idempotente), `isExpired(now: Date): boolean`, `resolveState(now: Date): SubscriptionState`, `closeExpired(now?: Date): void` (status `canceled`, `canceledAt = currentPeriodEnd`).
  - Erros (`DomainError`): `ActiveSubscriptionAlreadyExistsError` (`kind = "conflict"`), `SubscriptionCancellationScheduledError` (`kind = "conflict"`), `NoActiveSubscriptionError` (`kind = "not-found"`, mensagem "Você não possui assinatura ativa"), todos com construtor sem argumentos, em `apps/backend/src/subscription/domain/error/`.
  - `MySubscriptionView`, `MySubscriptionPlanView` e `toMySubscriptionView(subscription: Subscription, plan: Plan | null, now: Date): MySubscriptionView` em `apps/backend/src/subscription/application/dto/my-subscription-view.ts`.
  - `mySubscriptionResponseSchema` (zod object) e `nullableMySubscriptionResponseSchema` (mesmo objeto `.nullable()`) em `apps/backend/src/subscription/infra/controller/schema/my-subscription-response-schema.ts`.

### Conformidade com as Skills Padrão

- `no-workarounds`: o clamp de fim de mês é resolvido na causa (aritmética de calendário em UTC), sem corrigir o resultado depois.
- `test-antipatterns`: os testes exercitam o agregado real, sem mocks e sem métodos só de teste na produção.
- `typescript-advanced`: `SubscriptionState` como união literal e campos opcionais tipados de `create`/`restore`.

## Passos

- **Step 1: Confirm the existing symbols this task builds on**

Abra `apps/backend/src/subscription/domain/plan.ts` e confirme que `BILLING_PERIODS = ["monthly", "yearly"]` (valores em minúsculas) e que `Plan.restore` recebe `{ id, name, priceCents, billingPeriod, tagline, features, isActive, stripePriceId }`. Abra `apps/backend/src/subscription/domain/subscription.test.ts` e confirme que ele continua válido: os campos novos de `create` são opcionais, então os testes existentes não mudam.

- **Step 2: Write the failing test (computePeriodEnd)**

Crie `apps/backend/src/subscription/domain/compute-period-end.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { computePeriodEnd } from "./compute-period-end"

describe("computePeriodEnd", () => {
	it("soma um mês em plano mensal", () => {
		const end = computePeriodEnd(new Date("2026-03-10T08:30:00.000Z"), "monthly")

		expect(end.toISOString()).toBe("2026-04-10T08:30:00.000Z")
	})

	it("soma um ano em plano anual", () => {
		const end = computePeriodEnd(new Date("2026-03-10T08:30:00.000Z"), "yearly")

		expect(end.toISOString()).toBe("2027-03-10T08:30:00.000Z")
	})

	it("vira o ano quando o mês de início é dezembro", () => {
		const end = computePeriodEnd(new Date("2026-12-15T00:00:00.000Z"), "monthly")

		expect(end.toISOString()).toBe("2027-01-15T00:00:00.000Z")
	})

	it("clampa 29 de fevereiro de ano bissexto para 28 de fevereiro no plano anual", () => {
		const end = computePeriodEnd(new Date("2028-02-29T00:00:00.000Z"), "yearly")

		expect(end.toISOString()).toBe("2029-02-28T00:00:00.000Z")
	})
})
```

- **Step 3: Review Focus: Fim de período em 31 de janeiro, plano mensal → resultado clampa para o último dia de fevereiro, nunca transborda para março — Write the failing test**

Acrescente ao final do mesmo arquivo `compute-period-end.test.ts`:

```ts
describe("computePeriodEnd a partir de 31 de janeiro", () => {
	it("plano mensal em ano comum termina em 28 de fevereiro e não transborda para março", () => {
		const end = computePeriodEnd(new Date("2026-01-31T10:00:00.000Z"), "monthly")

		expect(end.toISOString()).toBe("2026-02-28T10:00:00.000Z")
		expect(end.getUTCMonth()).toBe(1)
	})

	it("plano mensal em ano bissexto termina em 29 de fevereiro", () => {
		const end = computePeriodEnd(new Date("2028-01-31T10:00:00.000Z"), "monthly")

		expect(end.toISOString()).toBe("2028-02-29T10:00:00.000Z")
	})

	it("plano mensal em 31 de março termina em 30 de abril", () => {
		const end = computePeriodEnd(new Date("2026-03-31T10:00:00.000Z"), "monthly")

		expect(end.toISOString()).toBe("2026-04-30T10:00:00.000Z")
	})
})
```

- **Step 4: Write the failing test (transições do agregado e erros)**

Crie `apps/backend/src/subscription/domain/subscription-plan-lifecycle.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { NoActiveSubscriptionError } from "./error/no-active-subscription-error.js"
import { SubscriptionCancellationScheduledError } from "./error/subscription-cancellation-scheduled-error.js"
import { ActiveSubscriptionAlreadyExistsError } from "./error/active-subscription-already-exists-error.js"
import { Subscription, type SubscriptionRestore } from "./subscription"

function makeSubscription(
	overrides: Partial<SubscriptionRestore> = {},
): Subscription {
	return Subscription.restore({
		id: "sub-1",
		userId: "user-1",
		billingSubscriptionId: "sub_stripe_1",
		customerId: "cus_1",
		status: "active",
		createdAt: new Date("2026-01-01T00:00:00.000Z"),
		planId: "plan-1",
		currentPeriodStart: new Date("2026-01-01T00:00:00.000Z"),
		currentPeriodEnd: new Date("2026-02-01T00:00:00.000Z"),
		cancelAtPeriodEnd: false,
		...overrides,
	})
}

describe("Subscription: plano e período", () => {
	it("create grava planId e calcula o fim do período pelo billingPeriod", () => {
		const subscription = Subscription.create({
			userId: "user-1",
			billingSubscriptionId: "sub_stripe_1",
			customerId: "cus_1",
			status: "active",
			planId: "plan-anual",
			billingPeriod: "yearly",
			currentPeriodStart: new Date("2026-03-10T00:00:00.000Z"),
		})

		expect(subscription.planId).toBe("plan-anual")
		expect(subscription.currentPeriodStart.toISOString()).toBe(
			"2026-03-10T00:00:00.000Z",
		)
		expect(subscription.currentPeriodEnd.toISOString()).toBe(
			"2027-03-10T00:00:00.000Z",
		)
		expect(subscription.cancelAtPeriodEnd).toBe(false)
	})

	it("restore de linha legada sem plano nem período usa createdAt e +1 mês", () => {
		const subscription = Subscription.restore({
			id: "sub-legacy",
			userId: "user-1",
			billingSubscriptionId: "sub_stripe_legacy",
			customerId: "cus_1",
			status: "active",
			createdAt: new Date("2026-01-31T00:00:00.000Z"),
		})

		expect(subscription.planId).toBeUndefined()
		expect(subscription.currentPeriodStart.toISOString()).toBe(
			"2026-01-31T00:00:00.000Z",
		)
		expect(subscription.currentPeriodEnd.toISOString()).toBe(
			"2026-02-28T00:00:00.000Z",
		)
		expect(subscription.cancelAtPeriodEnd).toBe(false)
	})
})

describe("Subscription.changePlan", () => {
	it("troca o planId mantendo a mesma assinatura e atualiza updatedAt", () => {
		const subscription = makeSubscription()
		const now = new Date("2026-01-10T00:00:00.000Z")

		subscription.changePlan("plan-2", now)

		expect(subscription.planId).toBe("plan-2")
		expect(subscription.id).toBe("sub-1")
		expect(subscription.updatedAt).toEqual(now)
	})

	it("aceita assinatura legada sem planId e grava o novo plano", () => {
		const subscription = makeSubscription({ planId: undefined })

		subscription.changePlan("plan-2")

		expect(subscription.planId).toBe("plan-2")
	})

	it("recusa a troca quando há cancelamento agendado", () => {
		const subscription = makeSubscription({ cancelAtPeriodEnd: true })

		expect(() => subscription.changePlan("plan-2")).toThrow(
			SubscriptionCancellationScheduledError,
		)
		expect(subscription.planId).toBe("plan-1")
	})

	it("assertCanChangePlan lança quando há cancelamento agendado e não lança sem ele", () => {
		expect(() => makeSubscription().assertCanChangePlan()).not.toThrow()
		expect(() =>
			makeSubscription({ cancelAtPeriodEnd: true }).assertCanChangePlan(),
		).toThrow(SubscriptionCancellationScheduledError)
	})
})

describe("Subscription.scheduleCancellation", () => {
	it("marca cancelAtPeriodEnd e mantém o status ativo", () => {
		const subscription = makeSubscription()
		const now = new Date("2026-01-10T00:00:00.000Z")

		subscription.scheduleCancellation(now)

		expect(subscription.cancelAtPeriodEnd).toBe(true)
		expect(subscription.status).toBe("active")
		expect(subscription.updatedAt).toEqual(now)
	})

	it("é idempotente: agendar de novo mantém o estado e não altera updatedAt", () => {
		const subscription = makeSubscription()
		const first = new Date("2026-01-10T00:00:00.000Z")
		subscription.scheduleCancellation(first)

		subscription.scheduleCancellation(new Date("2026-01-20T00:00:00.000Z"))

		expect(subscription.cancelAtPeriodEnd).toBe(true)
		expect(subscription.updatedAt).toEqual(first)
	})
})

describe("Subscription.isExpired e resolveState", () => {
	it("sem cancelamento agendado nunca está vencida, mesmo após o fim do período", () => {
		const subscription = makeSubscription()

		expect(subscription.isExpired(new Date("2027-01-01T00:00:00.000Z"))).toBe(
			false,
		)
		expect(subscription.resolveState(new Date("2027-01-01T00:00:00.000Z"))).toBe(
			"active",
		)
	})

	it("resolveState devolve cancel_scheduled antes do fim e expired depois", () => {
		const subscription = makeSubscription({ cancelAtPeriodEnd: true })

		expect(subscription.resolveState(new Date("2026-01-15T00:00:00.000Z"))).toBe(
			"cancel_scheduled",
		)
		expect(subscription.resolveState(new Date("2026-02-15T00:00:00.000Z"))).toBe(
			"expired",
		)
	})
})

describe("Subscription.closeExpired", () => {
	it("encerra a linha com status canceled e canceledAt igual ao fim do período", () => {
		const subscription = makeSubscription({ cancelAtPeriodEnd: true })
		const now = new Date("2026-03-01T00:00:00.000Z")

		subscription.closeExpired(now)

		expect(subscription.status).toBe("canceled")
		expect(subscription.canceledAt).toEqual(subscription.currentPeriodEnd)
		expect(subscription.updatedAt).toEqual(now)
	})
})

describe("erros de domínio da assinatura", () => {
	it("expõe kind e mensagem de cada erro", () => {
		expect(new ActiveSubscriptionAlreadyExistsError().kind).toBe("conflict")
		expect(new SubscriptionCancellationScheduledError().kind).toBe("conflict")
		const noActive = new NoActiveSubscriptionError()
		expect(noActive.kind).toBe("not-found")
		expect(noActive.message).toBe("Você não possui assinatura ativa")
	})
})
```

- **Step 5: Review Focus: `isExpired` exatamente em `currentPeriodEnd` → vencida (agora >= fim) e um instante antes não vencida — Write the failing test**

Acrescente ao final de `subscription-plan-lifecycle.test.ts`:

```ts
describe("Subscription.isExpired na fronteira de currentPeriodEnd", () => {
	it("está vencida exatamente em currentPeriodEnd e não está um milissegundo antes", () => {
		const end = new Date("2026-02-01T00:00:00.000Z")
		const subscription = makeSubscription({
			cancelAtPeriodEnd: true,
			currentPeriodEnd: end,
		})

		expect(subscription.isExpired(new Date(end.getTime() - 1))).toBe(false)
		expect(subscription.isExpired(new Date(end.getTime()))).toBe(true)
		expect(subscription.isExpired(new Date(end.getTime() + 1))).toBe(true)
		expect(subscription.resolveState(new Date(end.getTime()))).toBe("expired")
		expect(subscription.resolveState(new Date(end.getTime() - 1))).toBe(
			"cancel_scheduled",
		)
	})
})
```

- **Step 6: Write the failing test (MySubscriptionView)**

Crie `apps/backend/src/subscription/application/dto/my-subscription-view.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { Plan } from "../../domain/plan"
import { Subscription } from "../../domain/subscription"
import { toMySubscriptionView } from "./my-subscription-view"

const plan = Plan.restore({
	id: "plan-1",
	name: "Premium Mensal",
	priceCents: 4990,
	billingPeriod: "monthly",
	tagline: "Tagline",
	features: [],
	isActive: true,
	stripePriceId: "price_monthly",
})

function makeSubscription(
	overrides: Partial<Parameters<typeof Subscription.restore>[0]> = {},
) {
	return Subscription.restore({
		id: "sub-1",
		userId: "user-1",
		billingSubscriptionId: "sub_stripe_1",
		customerId: "cus_1",
		status: "active",
		createdAt: new Date("2026-01-01T00:00:00.000Z"),
		planId: "plan-1",
		currentPeriodStart: new Date("2026-01-01T00:00:00.000Z"),
		currentPeriodEnd: new Date("2026-02-01T00:00:00.000Z"),
		cancelAtPeriodEnd: false,
		...overrides,
	})
}

describe("toMySubscriptionView", () => {
	const now = new Date("2026-01-15T00:00:00.000Z")

	it("projeta assinatura ativa com plano embutido e datas em ISO UTC", () => {
		expect(toMySubscriptionView(makeSubscription(), plan, now)).toEqual({
			id: "sub-1",
			state: "active",
			plan: { id: "plan-1", name: "Premium Mensal", priceId: "price_monthly" },
			currentPeriodStart: "2026-01-01T00:00:00.000Z",
			currentPeriodEnd: "2026-02-01T00:00:00.000Z",
			cancelAtPeriodEnd: false,
		})
	})

	it("marca cancel_scheduled quando o cancelamento está agendado e o período não venceu", () => {
		const view = toMySubscriptionView(
			makeSubscription({ cancelAtPeriodEnd: true }),
			plan,
			now,
		)

		expect(view.state).toBe("cancel_scheduled")
		expect(view.cancelAtPeriodEnd).toBe(true)
	})

	it("marca expired quando o cancelamento agendado já venceu", () => {
		const view = toMySubscriptionView(
			makeSubscription({ cancelAtPeriodEnd: true }),
			plan,
			new Date("2026-02-01T00:00:00.000Z"),
		)

		expect(view.state).toBe("expired")
	})

	it("devolve plan null para linha legada sem plano", () => {
		const view = toMySubscriptionView(
			makeSubscription({ planId: undefined }),
			null,
			now,
		)

		expect(view.plan).toBeNull()
	})

	it("mantém o plano mesmo quando ele foi inativado no catálogo", () => {
		const view = toMySubscriptionView(makeSubscription(), plan.inactivate(), now)

		expect(view.plan).toEqual({
			id: "plan-1",
			name: "Premium Mensal",
			priceId: "price_monthly",
		})
	})
})
```

- **Step 7: Run tests to verify they fail**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/subscription/domain/compute-period-end.test.ts src/subscription/domain/subscription-plan-lifecycle.test.ts src/subscription/application/dto/my-subscription-view.test.ts`
Expected: FAIL with "Failed to resolve import ./compute-period-end" (and equivalent unresolved imports for the error files and `./my-subscription-view`); 0 tests pass in the 3 files.

- **Step 8: Write minimal implementation (cálculo do período e erros)**

Crie `apps/backend/src/subscription/domain/compute-period-end.ts`:

```ts
import type { BillingPeriod } from "./plan"

export function computePeriodEnd(
	start: Date,
	billingPeriod: BillingPeriod,
): Date {
	const monthsToAdd = billingPeriod === "yearly" ? 12 : 1
	const totalMonths = start.getUTCMonth() + monthsToAdd
	const targetYear = start.getUTCFullYear() + Math.floor(totalMonths / 12)
	const targetMonth = totalMonths % 12
	const lastDayOfTargetMonth = new Date(
		Date.UTC(targetYear, targetMonth + 1, 0),
	).getUTCDate()
	const day = Math.min(start.getUTCDate(), lastDayOfTargetMonth)
	return new Date(
		Date.UTC(
			targetYear,
			targetMonth,
			day,
			start.getUTCHours(),
			start.getUTCMinutes(),
			start.getUTCSeconds(),
			start.getUTCMilliseconds(),
		),
	)
}
```

Crie `apps/backend/src/subscription/domain/error/active-subscription-already-exists-error.ts`:

```ts
import { DomainError } from "@/shared/domain/error/domain-error.js"

export class ActiveSubscriptionAlreadyExistsError extends DomainError {
	public readonly kind = "conflict" as const

	constructor(errorOptions?: ErrorOptions) {
		super("Você já possui uma assinatura ativa", errorOptions)
		this.name = "ActiveSubscriptionAlreadyExistsError"
	}
}
```

Crie `apps/backend/src/subscription/domain/error/subscription-cancellation-scheduled-error.ts`:

```ts
import { DomainError } from "@/shared/domain/error/domain-error.js"

export class SubscriptionCancellationScheduledError extends DomainError {
	public readonly kind = "conflict" as const

	constructor(errorOptions?: ErrorOptions) {
		super(
			"O cancelamento desta assinatura já está agendado e não permite trocar de plano",
			errorOptions,
		)
		this.name = "SubscriptionCancellationScheduledError"
	}
}
```

Crie `apps/backend/src/subscription/domain/error/no-active-subscription-error.ts`:

```ts
import { DomainError } from "@/shared/domain/error/domain-error.js"

export class NoActiveSubscriptionError extends DomainError {
	public readonly kind = "not-found" as const

	constructor(errorOptions?: ErrorOptions) {
		super("Você não possui assinatura ativa", errorOptions)
		this.name = "NoActiveSubscriptionError"
	}
}
```

- **Step 9: Write minimal implementation (Subscription)**

Substitua o conteúdo de `apps/backend/src/subscription/domain/subscription.ts` por:

```ts
import { randomUUID } from "node:crypto"
import { computePeriodEnd } from "./compute-period-end"
import { SubscriptionCancellationScheduledError } from "./error/subscription-cancellation-scheduled-error.js"
import type { BillingPeriod } from "./plan"
import type { SubscriptionStatusTypes } from "./subscription-status-types"

export type SubscriptionState = "active" | "cancel_scheduled" | "expired"

export interface SubscriptionConstructor {
	id: string
	userId: string
	billingSubscriptionId: string
	customerId: string
	status: SubscriptionStatusTypes
	planId?: string
	currentPeriodStart: Date
	currentPeriodEnd: Date
	cancelAtPeriodEnd: boolean
	createdAt: Date
	updatedAt?: Date
	canceledAt?: Date
}

export interface SubscriptionCreate {
	id?: string
	userId: string
	billingSubscriptionId: string
	customerId: string
	status: SubscriptionStatusTypes
	planId?: string
	billingPeriod?: BillingPeriod
	currentPeriodStart?: Date
}

export interface SubscriptionRestore {
	id: string
	userId: string
	billingSubscriptionId: string
	customerId: string
	status: SubscriptionStatusTypes
	planId?: string
	currentPeriodStart?: Date
	currentPeriodEnd?: Date
	cancelAtPeriodEnd?: boolean
	createdAt: Date
	updatedAt?: Date
	canceledAt?: Date
}

export class Subscription {
	private readonly _id: string
	private readonly _userId: string
	private readonly _billingSubscriptionId: string
	private readonly _customerId: string
	private _status: SubscriptionStatusTypes
	private _planId?: string
	private readonly _currentPeriodStart: Date
	private readonly _currentPeriodEnd: Date
	private _cancelAtPeriodEnd: boolean
	private readonly _createdAt: Date
	private _updatedAt?: Date
	private _canceledAt?: Date

	private constructor(props: SubscriptionConstructor) {
		this._id = props.id
		this._userId = props.userId
		this._billingSubscriptionId = props.billingSubscriptionId
		this._customerId = props.customerId
		this._status = props.status
		this._planId = props.planId
		this._currentPeriodStart = props.currentPeriodStart
		this._currentPeriodEnd = props.currentPeriodEnd
		this._cancelAtPeriodEnd = props.cancelAtPeriodEnd
		this._createdAt = props.createdAt
		this._updatedAt = props.updatedAt
		this._canceledAt = props.canceledAt
	}

	public static create(props: SubscriptionCreate): Subscription {
		const createdAt = new Date()
		const currentPeriodStart = props.currentPeriodStart ?? createdAt
		return new Subscription({
			id: props.id ?? randomUUID(),
			userId: props.userId,
			billingSubscriptionId: props.billingSubscriptionId,
			customerId: props.customerId,
			status: props.status,
			planId: props.planId,
			currentPeriodStart,
			currentPeriodEnd: computePeriodEnd(
				currentPeriodStart,
				props.billingPeriod ?? "monthly",
			),
			cancelAtPeriodEnd: false,
			createdAt,
		})
	}

	public static restore(props: SubscriptionRestore): Subscription {
		return new Subscription({
			...props,
			currentPeriodStart: props.currentPeriodStart ?? props.createdAt,
			currentPeriodEnd:
				props.currentPeriodEnd ?? computePeriodEnd(props.createdAt, "monthly"),
			cancelAtPeriodEnd: props.cancelAtPeriodEnd ?? false,
		})
	}

	public get id(): string {
		return this._id
	}

	public get userId(): string {
		return this._userId
	}

	public get billingSubscriptionId(): string {
		return this._billingSubscriptionId
	}

	public get customerId(): string {
		return this._customerId
	}

	public get status(): SubscriptionStatusTypes {
		return this._status
	}

	public get planId(): string | undefined {
		return this._planId
	}

	public get currentPeriodStart(): Date {
		return this._currentPeriodStart
	}

	public get currentPeriodEnd(): Date {
		return this._currentPeriodEnd
	}

	public get cancelAtPeriodEnd(): boolean {
		return this._cancelAtPeriodEnd
	}

	public get createdAt(): Date {
		return this._createdAt
	}

	public get updatedAt(): Date | undefined {
		return this._updatedAt
	}

	public get canceledAt(): Date | undefined {
		return this._canceledAt
	}

	public changeStatus(newStatus: SubscriptionStatusTypes): void {
		this._status = newStatus
	}

	public activate(): void {
		this._status = "active"
		this._updatedAt = new Date()
	}

	public cancel(): void {
		this._status = "canceled"
		this._canceledAt = new Date()
		this._updatedAt = new Date()
	}

	public markAsPastDue(): void {
		this._status = "past_due"
		this._updatedAt = new Date()
	}

	public assertCanChangePlan(): void {
		if (this._cancelAtPeriodEnd) {
			throw new SubscriptionCancellationScheduledError()
		}
	}

	public changePlan(planId: string, now: Date = new Date()): void {
		this.assertCanChangePlan()
		this._planId = planId
		this._updatedAt = now
	}

	public scheduleCancellation(now: Date = new Date()): void {
		if (this._cancelAtPeriodEnd) return
		this._cancelAtPeriodEnd = true
		this._updatedAt = now
	}

	public isExpired(now: Date): boolean {
		return (
			this._cancelAtPeriodEnd &&
			now.getTime() >= this._currentPeriodEnd.getTime()
		)
	}

	public resolveState(now: Date): SubscriptionState {
		if (this.isExpired(now)) return "expired"
		return this._cancelAtPeriodEnd ? "cancel_scheduled" : "active"
	}

	public closeExpired(now: Date = new Date()): void {
		this._status = "canceled"
		this._canceledAt = this._currentPeriodEnd
		this._updatedAt = now
	}
}
```

- **Step 10: Write minimal implementation (view e schema de resposta)**

Crie `apps/backend/src/subscription/application/dto/my-subscription-view.ts`:

```ts
import type { Plan } from "../../domain/plan"
import type { Subscription, SubscriptionState } from "../../domain/subscription"

export interface MySubscriptionPlanView {
	id: string
	name: string
	priceId: string
}

export interface MySubscriptionView {
	id: string
	state: SubscriptionState
	plan: MySubscriptionPlanView | null
	currentPeriodStart: string
	currentPeriodEnd: string
	cancelAtPeriodEnd: boolean
}

export function toMySubscriptionView(
	subscription: Subscription,
	plan: Plan | null,
	now: Date,
): MySubscriptionView {
	return {
		id: subscription.id,
		state: subscription.resolveState(now),
		plan: plan
			? { id: plan.id, name: plan.name, priceId: plan.stripePriceId }
			: null,
		currentPeriodStart: subscription.currentPeriodStart.toISOString(),
		currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
		cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
	}
}
```

Crie `apps/backend/src/subscription/infra/controller/schema/my-subscription-response-schema.ts`:

```ts
import { z } from "zod"

export const mySubscriptionResponseSchema = z.object({
	id: z.string().meta({ description: "Subscription ID" }),
	state: z.enum(["active", "cancel_scheduled", "expired"]).meta({
		description:
			"Derived state: expired only when the cancellation was scheduled and the period ended",
		example: "active",
	}),
	plan: z
		.object({
			id: z.string().meta({ description: "Plan ID" }),
			name: z.string().meta({ description: "Plan name" }),
			priceId: z.string().meta({ description: "Stripe Price ID of the plan" }),
		})
		.nullable()
		.meta({ description: "Current plan, null for legacy subscriptions" }),
	currentPeriodStart: z.string().meta({
		description: "Start of the paid period (ISO 8601 UTC)",
		example: "2026-10-15T12:00:00.000Z",
	}),
	currentPeriodEnd: z.string().meta({
		description: "End of the paid period (ISO 8601 UTC)",
		example: "2026-11-15T12:00:00.000Z",
	}),
	cancelAtPeriodEnd: z
		.boolean()
		.meta({ description: "True when the cancellation is scheduled" }),
})

export const nullableMySubscriptionResponseSchema =
	mySubscriptionResponseSchema.nullable()
```

- **Step 11: Run tests to verify they pass**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/subscription/domain/compute-period-end.test.ts src/subscription/domain/subscription-plan-lifecycle.test.ts src/subscription/application/dto/my-subscription-view.test.ts src/subscription/domain/subscription.test.ts`
Expected: PASS, 4 test files, incluindo os 5 testes preexistentes de `subscription.test.ts`.

- **Step 12: Commit** *(only when `workflow.auto_commit` is true; otherwise skip and report the files)*

```bash
git add apps/backend/src/subscription
git commit -m "feat(subscription): add plan, period and lifecycle transitions to Subscription"
```

## Critérios de Sucesso

- `computePeriodEnd` soma 1 mês (monthly) ou 1 ano (yearly) em UTC e clampa para o último dia do mês destino (FR-003).
- `changePlan` recusa com `SubscriptionCancellationScheduledError` quando há cancelamento agendado e aceita linha legada sem `planId` (FR-010, FR-012).
- `scheduleCancellation` marca `cancelAtPeriodEnd`, mantém `status = "active"` e é idempotente (FR-013, FR-014).
- `isExpired(now)` é verdadeiro somente com cancelamento agendado e `now >= currentPeriodEnd`; `resolveState` reflete os três estados (FR-017).
- Os testes preexistentes de `subscription.test.ts` continuam passando sem alteração.
