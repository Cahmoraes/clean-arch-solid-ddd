# Task 2: Remover SubscriptionRepository.ofId()/ofUserId() e migrar 2 testes

**Status:** DONE
**PRD:** N/A
**Spec:** `../specs/backend-deepening-refactors-design.md`
**Depends on:** N/A

## Visão Geral

`SubscriptionRepository.ofId()` tem **zero callers**. `ofUserId()` tem zero callers em produção — apenas 2 testes o usam para verificar estado após criação de subscription. Ambos saem da interface e das implementações; os 2 testes migram para `ofCustomerId()`, que verifica o mesmo estado pela mesma interface.

## Arquivos

- Modify: `apps/backend/src/subscription/repository/subscription-repository.ts`
- Modify: `apps/backend/src/shared/infra/database/repository/prisma/prisma-subscription-repository.ts`
- Modify: `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-subscription-repository.ts`
- Modify (teste): `apps/backend/src/subscription/infra/controller/create-subscription.controller.business-flow-test.ts`
- Modify (teste): `apps/backend/src/subscription/application/use-case/create-subscription.usecase.test.ts`

### Conformidade com as Skills Padrão

- refactoring: estreitamento de interface sem mudança de comportamento
- test-antipatterns: testes migram para verificar o MESMO comportamento por outro método da interface pública (não por internals)
- no-workarounds: sem stubs, sem manter métodos "por precaução"

## Passos

Todos os comandos rodam a partir da raiz do monorepo.

- **Step 1: Migrar o teste unitário para ofCustomerId()**

Em `apps/backend/src/subscription/application/use-case/create-subscription.usecase.test.ts`, linha ~48:

```typescript
// ANTES
	const subscriptionSaved = await subscriptionRepository.ofUserId(input.userId)

// DEPOIS
	const subscriptionSaved = await subscriptionRepository.ofCustomerId(
		input.customerId,
	)
```

O `input.customerId` é `"cus_test_123"` (definido no `baseInput()` do próprio teste, linhas ~31-36). As assertions seguintes (`subscriptionSaved?.userId`, `?.customerId`, `?.billingSubscriptionId`, `?.status`) permanecem idênticas.

- **Step 2: Rodar o teste unitário migrado**

Run: `pnpm --filter backend test:run -- -t "Deve criar uma Subscription"`
Expected: PASS — a verificação por `ofCustomerId` encontra a mesma subscription.

- **Step 3: Migrar o business-flow test para ofCustomerId()**

Em `apps/backend/src/subscription/infra/controller/create-subscription.controller.business-flow-test.ts`, linha ~79:

```typescript
// ANTES
		const saved = await subscriptionRepository.ofUserId("user-with-billing")

// DEPOIS
		const saved = await subscriptionRepository.ofCustomerId(
			"cus_existing_billing",
		)
```

`"cus_existing_billing"` é o billingCustomerId atribuído ao user no próprio teste via `user.assignBillingCustomerId("cus_existing_billing")`. As assertions seguintes permanecem idênticas.

- **Step 4: Rodar o business-flow test migrado**

Run: `pnpm --filter backend test:business-flow -- -t "Deve retornar 201 e criar a Subscription"`
Expected: PASS.

- **Step 5: Remover os métodos da interface**

Em `apps/backend/src/subscription/repository/subscription-repository.ts`:

```typescript
// ANTES
export interface SubscriptionRepository {
	save(subscription: Subscription): Promise<void>
	update(subscription: Subscription): Promise<void>
	ofId(id: string): Promise<Subscription | null>
	ofUserId(userId: string): Promise<Subscription | null>
	ofBillingSubscriptionId(
		billingSubscriptionId: string,
	): Promise<Subscription | null>
	ofCustomerId(customerId: string): Promise<Subscription | null>
	withTransaction<TX extends object>(tx: TX): SubscriptionRepository
}

// DEPOIS
export interface SubscriptionRepository {
	save(subscription: Subscription): Promise<void>
	update(subscription: Subscription): Promise<void>
	ofBillingSubscriptionId(
		billingSubscriptionId: string,
	): Promise<Subscription | null>
	ofCustomerId(customerId: string): Promise<Subscription | null>
	withTransaction<TX extends object>(tx: TX): SubscriptionRepository
}
```

- **Step 6: Remover os métodos das 2 implementações**

Em `apps/backend/src/shared/infra/database/repository/prisma/prisma-subscription-repository.ts` (linhas ~65-77), remover:

```typescript
	public async ofId(id: string): Promise<Subscription | null> {
		const data = await this.prisma.subscription.findUnique({ where: { id } })
		if (!data) return null
		return this.restore(data as SubscriptionData)
	}

	public async ofUserId(userId: string): Promise<Subscription | null> {
		const data = await this.prisma.subscription.findFirst({
			where: { user_id: userId },
		})
		if (!data) return null
		return this.restore(data as SubscriptionData)
	}
```

Em `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-subscription-repository.ts` (linhas ~22-28), remover:

```typescript
	public async ofId(id: string): Promise<Subscription | null> {
		return this.data.find((subscriptions) => subscriptions.id === id)
	}

	public async ofUserId(userId: string): Promise<Subscription | null> {
		return this.data.find((subscriptions) => subscriptions.userId === userId)
	}
```

- **Step 7: Rodar a validação completa**

Run: `pnpm --filter backend biome:fix && pnpm --filter backend tsc:check && pnpm --filter backend test:run`
Expected: biome zero issues, tsc zero erros, todos os testes unitários PASS.

Run: `pnpm --filter backend test:business-flow && pnpm --filter backend build`
Expected: todos os business-flow tests PASS, build com sucesso.

- **Step 8: Commit**

```bash
git add apps/backend/src/subscription/repository/subscription-repository.ts apps/backend/src/shared/infra/database/repository/prisma/prisma-subscription-repository.ts apps/backend/src/shared/infra/database/repository/in-memory/in-memory-subscription-repository.ts apps/backend/src/subscription/infra/controller/create-subscription.controller.business-flow-test.ts apps/backend/src/subscription/application/use-case/create-subscription.usecase.test.ts
git commit -m "refactor(subscription): remove dead ofId/ofUserId from SubscriptionRepository"
```

## Critérios de Sucesso

- `SubscriptionRepository` tem 5 métodos (save, update, ofBillingSubscriptionId, ofCustomerId, withTransaction)
- Os 2 testes verificam o mesmo estado via `ofCustomerId()`
- `pnpm --filter backend biome:fix`, `tsc:check`, `test:run`, `test:business-flow` e `build` passam 100%
