# Task 6: Migrar 17 erros Gym/CheckIn/Notification/Subscription/Shared e tratar overrides

**Status:** DONE
**PRD:** N/A
**Spec:** `../specs/backend-deepening-refactors-design.md`
**Depends on:** task-03, task-04

## Visão Geral

Migra os erros de negócio dos contextos **Gym**, **Check-In**, **Notification**, **Subscription** e **Shared** para `DomainError` (com `kind`), e remove os 3 overrides `mapResponseError()` "tudo → 409" desses contextos (check-in, validate-check-in, create-gym), corrigindo as inconsistências da spec R1.5.

Depende da task-03 porque `InvalidLatitudeError`/`InvalidLongitudeError` agora vivem em `shared/domain/error/`, e da task-04 pela classe `DomainError`.

**Erros técnicos que NÃO migram:** `ContractError`, `InvalidTransactionInstance` e erros do circuit-breaker continuam estendendo `Error`.

## Arquivos

**Erros Gym (Modify, 4 arquivos):**
- `apps/backend/src/gym/application/error/gym-already-exists-error.ts`
- `apps/backend/src/gym/application/error/gym-not-found-error.ts`
- `apps/backend/src/gym/application/error/gym-with-cnpj-already-exists-error.ts`
- `apps/backend/src/gym/domain/error/invalid-cnpj-error.ts`

**Erros Check-In (Modify, 6 arquivos):**
- `apps/backend/src/check-in/application/error/check-in-not-found-error.ts`
- `apps/backend/src/check-in/application/error/duplicate-check-in-error.ts`
- `apps/backend/src/check-in/application/error/max-distance-error.ts`
- `apps/backend/src/check-in/domain/error/check-in-already-rejected-error.ts`
- `apps/backend/src/check-in/domain/error/check-in-time-exceeded-error.ts`
- `apps/backend/src/check-in/domain/error/invalid-distance-error.ts`

**Erros Notification (Modify, 1 arquivo):**
- `apps/backend/src/notification/domain/errors/notification-not-found-error.ts`

**Erros Subscription (Modify, 3 arquivos):**
- `apps/backend/src/subscription/application/error/billing-customer-not-provisioned-error.ts`
- `apps/backend/src/subscription/application/error/duplicate-webhook-event-error.ts`
- `apps/backend/src/subscription/application/error/subscription-not-found-error.ts`

**Erros Shared (Modify, 3 arquivos):**
- `apps/backend/src/shared/domain/error/invalid-id-error.ts`
- `apps/backend/src/shared/domain/error/invalid-latitude-error.ts` (criado na task-03)
- `apps/backend/src/shared/domain/error/invalid-longitude-error.ts` (criado na task-03)

**Controllers — overrides removidos (Modify, 3 arquivos):**
- `apps/backend/src/check-in/infra/controller/check-in.controller.ts`
- `apps/backend/src/check-in/infra/controller/validate-check-in.controller.ts`
- `apps/backend/src/gym/infra/controller/create-gym.controller.ts`

**Testes — assertions possivelmente atualizadas (Modify, conforme Step 5):**
- `apps/backend/src/check-in/infra/controller/check-in.business-flow-test.ts`
- `apps/backend/src/check-in/infra/controller/validate-check-in.controller.business-flow-test.ts`
- `apps/backend/src/gym/infra/controller/create-gym.business-flow-test.ts`

### Conformidade com as Skills Padrão

- refactoring: mudança mecânica de superclasse + remoção de código redundante
- test-antipatterns: assertions atualizadas refletem o NOVO contrato correto (R1.5), não acomodam bugs
- no-workarounds: nenhum cast, nenhum erro "meio migrado"

## Passos

Todos os comandos rodam a partir da raiz do monorepo. Indentação: tab (Biome).

- **Step 1: Migrar os 17 erros — padrão de transformação**

Mesma transformação de 3 partes da task-05: (a) `import { DomainError } from "@/shared/domain/error/domain-error"` (nos arquivos de `shared/domain/error/`, usar import relativo `from "./domain-error"`), (b) `extends Error` → `extends DomainError`, (c) declarar `public readonly kind`.

Exemplo completo (`gym-already-exists-error.ts`):

```typescript
// ANTES
export class GymAlreadyExistsError extends Error {
	constructor(errorOptions?: ErrorOptions) {
		super("Gym already exists", errorOptions)
		this.name = "GymAlreadyExistsError"
	}
}

// DEPOIS
import { DomainError } from "@/shared/domain/error/domain-error"

export class GymAlreadyExistsError extends DomainError {
	public readonly kind = "conflict"

	constructor(errorOptions?: ErrorOptions) {
		super("Gym already exists", errorOptions)
		this.name = "GymAlreadyExistsError"
	}
}
```

Exemplo com import relativo (`shared/domain/error/invalid-latitude-error.ts`):

```typescript
// ANTES
export class InvalidLatitudeError extends Error {
	constructor(errorOptions?: ErrorOptions) {
		super("Invalid latitude", errorOptions)
		this.name = "InvalidLatitudeError"
	}
}

// DEPOIS
import { DomainError } from "./domain-error"

export class InvalidLatitudeError extends DomainError {
	public readonly kind = "validation"

	constructor(errorOptions?: ErrorOptions) {
		super("Invalid latitude", errorOptions)
		this.name = "InvalidLatitudeError"
	}
}
```

Exemplo com construtor de argumentos (`gym-with-cnpj-already-exists-error.ts`):

```typescript
// ANTES
export class GymWithCNPJAlreadyExistsError extends Error {
	constructor(aString: string, errorOptions?: ErrorOptions) {
		super(`Academia com CNPJ ${aString} já existe`, errorOptions)
		this.name = "GymWithCNPJAlreadyExistsError"
	}
}

// DEPOIS
import { DomainError } from "@/shared/domain/error/domain-error"

export class GymWithCNPJAlreadyExistsError extends DomainError {
	public readonly kind = "conflict"

	constructor(aString: string, errorOptions?: ErrorOptions) {
		super(`Academia com CNPJ ${aString} já existe`, errorOptions)
		this.name = "GymWithCNPJAlreadyExistsError"
	}
}
```

Exemplo com `readonly name` como propriedade (`invalid-cnpj-error.ts`):

```typescript
// ANTES
export class InvalidCNPJError extends Error {
	public readonly name = "InvalidCNPJError"

	constructor(message: string, cause?: ErrorOptions) {
		super(`${message}`, cause)
	}
}

// DEPOIS
import { DomainError } from "@/shared/domain/error/domain-error"

export class InvalidCNPJError extends DomainError {
	public readonly name = "InvalidCNPJError"
	public readonly kind = "validation"

	constructor(message: string, cause?: ErrorOptions) {
		super(`${message}`, cause)
	}
}
```

Aplicar em TODOS os arquivos com os kinds da tabela:

| Arquivo | Classe | kind |
|---|---|---|
| gym/application/error/gym-already-exists-error.ts | GymAlreadyExistsError | `conflict` |
| gym/application/error/gym-not-found-error.ts | GymNotFoundError | `not-found` |
| gym/application/error/gym-with-cnpj-already-exists-error.ts | GymWithCNPJAlreadyExistsError | `conflict` |
| gym/domain/error/invalid-cnpj-error.ts | InvalidCNPJError | `validation` |
| check-in/application/error/check-in-not-found-error.ts | CheckInNotFoundError | `not-found` |
| check-in/application/error/duplicate-check-in-error.ts | DuplicateCheckInError | `conflict` |
| check-in/application/error/max-distance-error.ts | MaxDistanceError | `conflict` |
| check-in/domain/error/check-in-already-rejected-error.ts | CheckInAlreadyRejectedError | `conflict` |
| check-in/domain/error/check-in-time-exceeded-error.ts | CheckInTimeExceededError | `conflict` |
| check-in/domain/error/invalid-distance-error.ts | InvalidDistanceError | `validation` |
| notification/domain/errors/notification-not-found-error.ts | NotificationNotFoundError | `not-found` |
| subscription/application/error/billing-customer-not-provisioned-error.ts | BillingCustomerNotProvisionedError | `conflict` |
| subscription/application/error/duplicate-webhook-event-error.ts | DuplicateWebhookEventError | `conflict` |
| subscription/application/error/subscription-not-found-error.ts | SubscriptionNotFoundError | `not-found` |
| shared/domain/error/invalid-id-error.ts | InvalidIdError | `validation` |
| shared/domain/error/invalid-latitude-error.ts | InvalidLatitudeError | `validation` |
| shared/domain/error/invalid-longitude-error.ts | InvalidLongitudeError | `validation` |

- **Step 2: Rodar testes unitários (verificação intermediária)**

Run: `pnpm --filter backend tsc:check && pnpm --filter backend test:run`
Expected: PASS — migração preserva nome, mensagem e identidade de classe.

- **Step 3: Remover os 3 overrides "tudo → 409"**

Em cada controller abaixo, **deletar o método `mapResponseError()` completo** e remover imports órfãos (`ZodError`, `ResponseFactory`, `HTTP_STATUS` — apenas se não usados em outro lugar do arquivo):

`apps/backend/src/check-in/infra/controller/check-in.controller.ts` (linhas ~60-70):

```typescript
	protected override mapResponseError(
		error: Error | Error[],
	): HandleCallbackResponse | undefined {
		if (Array.isArray(error) || error instanceof ZodError) {
			return undefined
		}

		return ResponseFactory.CONFLICT({
			message: error.message,
		})
	}
```

`apps/backend/src/check-in/infra/controller/validate-check-in.controller.ts` (linhas ~66-77):

```typescript
	protected override mapResponseError(
		error: Error | Error[],
	): HandleCallbackResponse | undefined {
		if (Array.isArray(error) || error instanceof ZodError) {
			return undefined
		}

		return ResponseFactory.create({
			status: HTTP_STATUS.CONFLICT,
			message: error.message,
		})
	}
```

`apps/backend/src/gym/infra/controller/create-gym.controller.ts` (linhas ~71-81):

```typescript
	protected override mapResponseError(
		error: Error | Error[],
	): HandleCallbackResponse | undefined {
		if (Array.isArray(error) || error instanceof ZodError) {
			return undefined
		}

		return ResponseFactory.CONFLICT({
			message: error.message,
		})
	}
```

**Mudanças de comportamento resultantes (esperadas, spec R1.5):**

| Controller | Erro | Antes | Depois |
|---|---|---|---|
| check-in | UserNotFoundError / GymNotFoundError | 409 | 404 |
| check-in | MaxDistanceError, UserHasAlreadyCheckedInToday, DuplicateCheckInError | 409 | 409 (sem mudança) |
| validate-check-in | CheckInNotFoundError | 409 | 404 |
| validate-check-in | CheckInTimeExceededError, CheckInAlreadyRejectedError | 409 | 409 (sem mudança) |
| create-gym | GymAlreadyExistsError, GymWithCNPJAlreadyExistsError | 409 | 409 (sem mudança) |
| create-gym | InvalidCNPJError (erro único, fora de array) | 409 | 422 |

- **Step 4: Rodar testes unitários novamente**

Run: `pnpm --filter backend test:run`
Expected: PASS (testes unitários de use case não exercitam o mapeamento HTTP).

- **Step 5: Rodar business-flow tests e atualizar assertions**

Run: `pnpm --filter backend test:business-flow`
Expected: FALHAS APENAS em assertions que cobrem as mudanças da tabela do Step 3, nos arquivos:

- `apps/backend/src/check-in/infra/controller/check-in.business-flow-test.ts`
- `apps/backend/src/check-in/infra/controller/validate-check-in.controller.business-flow-test.ts` (atenção: linha ~89 asserta `HTTP_STATUS.CONFLICT` — só atualizar se o cenário do teste for "check-in não encontrado"; se for "tempo excedido", o status continua 409 e o teste não deve falhar)
- `apps/backend/src/gym/infra/controller/create-gym.business-flow-test.ts`

Para cada falha: confirmar que a mudança consta na tabela do Step 3 e atualizar o status esperado (ex.: `HTTP_STATUS.CONFLICT` → `HTTP_STATUS.NOT_FOUND` para recurso inexistente). **Falha fora da tabela = regressão — parar e investigar com systematic-debugging, não ajustar o teste.**

Run: `pnpm --filter backend test:business-flow`
Expected: 100% PASS após atualizações.

- **Step 6: Validação completa**

Run: `pnpm --filter backend biome:fix && pnpm --filter backend tsc:check && pnpm --filter backend test:run && pnpm --filter backend test:business-flow && pnpm --filter backend build`
Expected: tudo 100% PASS / zero issues.

- **Step 7: Commit**

```bash
git add -A apps/backend/src
git commit -m "refactor(gym,check-in,notification,subscription): migrate errors to DomainError kinds and drop catch-all 409 overrides"
```

## Critérios de Sucesso

- 17 classes de erro estendem `DomainError` com o `kind` da tabela
- 3 overrides "tudo → 409" removidos (check-in, validate-check-in, create-gym)
- Recursos inexistentes retornam 404 (não mais 409/422) nesses endpoints
- `ContractError`, `InvalidTransactionInstance` e circuit-breaker continuam estendendo `Error`
- Validação completa passa 100%
