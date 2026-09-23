# Task 3: Gateway: alteração de price da assinatura [FR-009]

**Status:** DONE

**PRD:** `../prd/prd-subscription-plan-link.md`

**Spec:** `../specs/subscription-plan-link-design.md`

**Tier:** cheap

**Depends on:** N/A

## Visão Geral

A troca de plano mantém a mesma assinatura, então o gateway precisa saber trocar o price de uma assinatura existente. Esta task acrescenta esse método à interface `SubscriptionGateway`, à implementação Stripe (sem cobrança proporcional) e ao gateway de testes, que registra as trocas e permite simular falha para os testes do caso de uso.

## Arquivos

- Modify: `apps/backend/src/subscription/gateway/subscription-gateway.ts`
- Modify: `apps/backend/src/shared/infra/gateway/stripe-subscription-gateway.ts`
- Modify: `apps/backend/src/shared/infra/gateway/testing-subscription-gateway.ts`
- Create: `apps/backend/src/shared/infra/gateway/testing-subscription-gateway.test.ts`
- Create: `apps/backend/src/shared/infra/gateway/stripe-subscription-gateway.test.ts`

## Interfaces

- **Consome:** N/A
- **Produz:**
  - `interface ChangeSubscriptionPriceInput { billingSubscriptionId: string; priceId: string }` exportada de `@/subscription/gateway/subscription-gateway`.
  - `SubscriptionGateway.changeSubscriptionPrice(data: ChangeSubscriptionPriceInput): Promise<void>` (lança em caso de falha, sem Either).
  - `TestingSubscriptionGateway.changedPrices: ChangeSubscriptionPriceInput[]` (registro das trocas bem-sucedidas) e `TestingSubscriptionGateway.failPriceChangeWith(error: Error): void` (faz as próximas chamadas de `changeSubscriptionPrice` lançarem esse erro, sem registrar a troca).

### Conformidade com as Skills Padrão

- `no-workarounds`: a chamada ao SDK segue os tipos reais do Stripe instalado; nada de cast para `any`.
- `test-antipatterns`: o teste do Stripe mocka apenas a fronteira externa (o SDK), e o fake de testes é uma implementação real da interface, não um mock que testa a si mesmo.
- `typescript-advanced`: tipos do input e do retorno espelham `Stripe.SubscriptionUpdateParams`.

## Passos

- **Step 1: Confirm the Stripe SDK update API and the test environment**

Não adivinhe a API do SDK. Abra os tipos do pacote `stripe` instalado (`apps/backend/node_modules/stripe/types/`, procure `SubscriptionUpdateParams`, `SubscriptionsResource.retrieve` e `SubscriptionsResource.update`) e confirme: (a) `stripe.subscriptions.retrieve(id)` devolve `Stripe.Subscription` com `items.data[0].id`; (b) `stripe.subscriptions.update(id, params)` aceita `items: [{ id, price }]` e `proration_behavior: "none"`. Se algum nome diferir na versão instalada, use o nome que os tipos declaram nos trechos abaixo. Confirme também que o ambiente de testes unitários provê `STRIPE_PRIVATE_KEY` e `STRIPE_WEBHOOK_SECRET` para `@/shared/infra/env` (os testes do gateway Stripe importam `../env` indiretamente); se não provê, o teste abaixo precisa mockar `../env` no mesmo estilo de outros testes do repositório (`rg "vi.mock\(.*env" apps/backend/src`).

- **Step 2: Write the failing test (gateway de testes)**

Crie `apps/backend/src/shared/infra/gateway/testing-subscription-gateway.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { TestingSubscriptionGateway } from "./testing-subscription-gateway"

describe("TestingSubscriptionGateway.changeSubscriptionPrice", () => {
	it("registra a troca de price em changedPrices", async () => {
		const sut = new TestingSubscriptionGateway()

		await sut.changeSubscriptionPrice({
			billingSubscriptionId: "sub_test_1",
			priceId: "price_yearly",
		})

		expect(sut.changedPrices).toEqual([
			{ billingSubscriptionId: "sub_test_1", priceId: "price_yearly" },
		])
	})

	it("lança o erro configurado por failPriceChangeWith e não registra a troca", async () => {
		const sut = new TestingSubscriptionGateway()
		const error = new Error("stripe indisponível")
		sut.failPriceChangeWith(error)

		await expect(
			sut.changeSubscriptionPrice({
				billingSubscriptionId: "sub_test_1",
				priceId: "price_yearly",
			}),
		).rejects.toBe(error)
		expect(sut.changedPrices).toEqual([])
	})
})
```

- **Step 3: Write the failing test (gateway Stripe)**

Crie `apps/backend/src/shared/infra/gateway/stripe-subscription-gateway.test.ts` (o SDK é a fronteira externa e é o único mockado):

```ts
import { beforeEach, describe, expect, it, vi } from "vitest"

const stripeMock = vi.hoisted(() => ({
	subscriptions: {
		retrieve: vi.fn(),
		update: vi.fn(),
	},
}))

vi.mock("stripe", () => ({
	default: vi.fn(function StripeMock() {
		return stripeMock
	}),
}))

import { StripeSubscriptionGateway } from "./stripe-subscription-gateway"

describe("StripeSubscriptionGateway.changeSubscriptionPrice", () => {
	beforeEach(() => {
		stripeMock.subscriptions.retrieve.mockReset()
		stripeMock.subscriptions.update.mockReset()
	})

	it("troca o price do item existente da assinatura sem cobrança proporcional", async () => {
		stripeMock.subscriptions.retrieve.mockResolvedValue({
			id: "sub_1",
			items: { data: [{ id: "si_1" }] },
		})
		stripeMock.subscriptions.update.mockResolvedValue({ id: "sub_1" })
		const sut = new StripeSubscriptionGateway()

		await sut.changeSubscriptionPrice({
			billingSubscriptionId: "sub_1",
			priceId: "price_yearly",
		})

		expect(stripeMock.subscriptions.retrieve).toHaveBeenCalledWith("sub_1")
		expect(stripeMock.subscriptions.update).toHaveBeenCalledWith("sub_1", {
			items: [{ id: "si_1", price: "price_yearly" }],
			proration_behavior: "none",
		})
	})

	it("propaga o erro do SDK sem engolir", async () => {
		const error = new Error("stripe down")
		stripeMock.subscriptions.retrieve.mockRejectedValue(error)
		const sut = new StripeSubscriptionGateway()

		await expect(
			sut.changeSubscriptionPrice({
				billingSubscriptionId: "sub_1",
				priceId: "price_yearly",
			}),
		).rejects.toBe(error)
		expect(stripeMock.subscriptions.update).not.toHaveBeenCalled()
	})
})
```

- **Step 4: Run tests to verify they fail**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/shared/infra/gateway/testing-subscription-gateway.test.ts src/shared/infra/gateway/stripe-subscription-gateway.test.ts`
Expected: FAIL with "sut.changeSubscriptionPrice is not a function" in both files.

- **Step 5: Write minimal implementation (interface)**

Em `apps/backend/src/subscription/gateway/subscription-gateway.ts`, acrescente o tipo depois de `CreateSubscriptionResponse`:

```ts
export interface ChangeSubscriptionPriceInput {
	billingSubscriptionId: string
	priceId: string
}
```

e o método à interface `SubscriptionGateway`, depois de `createSubscription`:

```ts
	changeSubscriptionPrice(data: ChangeSubscriptionPriceInput): Promise<void>
```

- **Step 6: Write minimal implementation (Stripe e gateway de testes)**

Em `stripe-subscription-gateway.ts`, acrescente `ChangeSubscriptionPriceInput` ao import de tipos de `@/subscription/gateway/subscription-gateway` e o método (depois de `createSubscription`):

```ts
	public async changeSubscriptionPrice(
		data: ChangeSubscriptionPriceInput,
	): Promise<void> {
		const current = await this.stripe.subscriptions.retrieve(
			data.billingSubscriptionId,
		)
		const item = current.items.data[0]
		requires(
			item,
			`Item da assinatura ${data.billingSubscriptionId} não encontrado`,
		)
		await this.stripe.subscriptions.update(data.billingSubscriptionId, {
			items: [{ id: item.id, price: data.priceId }],
			proration_behavior: "none",
		})
	}
```

Em `testing-subscription-gateway.ts`, acrescente `ChangeSubscriptionPriceInput` ao import de tipos e, na classe:

```ts
	public changedPrices: ChangeSubscriptionPriceInput[] = []
	private priceChangeError: Error | null = null

	public failPriceChangeWith(error: Error): void {
		this.priceChangeError = error
	}

	public async changeSubscriptionPrice(
		data: ChangeSubscriptionPriceInput,
	): Promise<void> {
		if (this.priceChangeError) throw this.priceChangeError
		this.changedPrices.push(data)
	}
```

- **Step 7: Run tests to verify they pass**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/shared/infra/gateway/testing-subscription-gateway.test.ts src/shared/infra/gateway/stripe-subscription-gateway.test.ts`
Expected: PASS, 2 arquivos, 4 testes.

- **Step 8: Commit** *(only when `workflow.auto_commit` is true; otherwise skip and report the files)*

```bash
git add apps/backend/src/subscription/gateway apps/backend/src/shared/infra/gateway
git commit -m "feat(subscription): add changeSubscriptionPrice to the subscription gateway"
```

## Critérios de Sucesso

- `SubscriptionGateway` expõe `changeSubscriptionPrice` e ambas as implementações a satisfazem (FR-009).
- A implementação Stripe troca o price do item existente da mesma assinatura, sem criar outra e sem proration.
- O gateway de testes registra as trocas e consegue simular falha para os casos de uso.
