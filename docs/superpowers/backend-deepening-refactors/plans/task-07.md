# Task 7: Remover heurísticas legadas do BaseController e validação final

**Status:** DONE
**PRD:** N/A
**Spec:** `../specs/backend-deepening-refactors-design.md`
**Depends on:** task-05, task-06

## Visão Geral

Com TODOS os 44 erros de negócio migrados para `DomainError` (tasks 05 e 06), as heurísticas legadas do `BaseController` (sets de strings `CONFLICT_ERRORS`/`UNAUTHORIZED_ERRORS`, `endsWith("NotFoundError")`, `startsWith("Invalid")`) não têm mais nenhum erro para cobrir. Esta tarefa as remove, deixando o caminho de erro com exatamente 4 ramos: override do controller → DomainError.kind → ZodError/array (validação de input) → 500.

## Arquivos

- Modify: `apps/backend/src/shared/infra/controller/base-controller.ts`
- Modify: `apps/backend/src/shared/infra/controller/base-controller.test.ts`

### Conformidade com as Skills Padrão

- refactoring: Remove Dead Code — as heurísticas não têm mais nenhum erro que dependa delas
- test-antipatterns: teste de fallback atualizado para refletir o novo contrato (erro técnico → 500)
- no-workarounds: deleção definitiva, sem feature flag

## Passos

Todos os comandos rodam a partir da raiz do monorepo.

- **Step 1: Confirmar pré-condição — nenhum erro de negócio fora da hierarquia DomainError**

Run: `grep -rln "extends Error" apps/backend/src --include="*-error.ts" | grep -v "\.test\."`
Expected: APENAS arquivos de erros técnicos: `shared/domain/contract-error.ts` (se nomeado assim), `shared/infra/errors/invalid-transaction-instance-error.ts`. Se aparecer qualquer erro de negócio (user/gym/check-in/session/subscription/notification), as tasks 05/06 não foram concluídas — PARE.

Run: `grep -rn "extends Error" apps/backend/src/user apps/backend/src/gym apps/backend/src/check-in apps/backend/src/session apps/backend/src/subscription apps/backend/src/notification --include="*.ts" | grep -v "\.test\.\|business-flow"`
Expected: saída vazia (nenhum erro de negócio estende Error diretamente).

- **Step 2: Atualizar o teste do fallback no base-controller.test.ts — deve falhar**

O teste existente "Erro fora da hierarquia DomainError mantém fallback legado (heurística por nome)" (adicionado na task-04) usa `UserAlreadyExistsError`, que agora É um DomainError. Substituir esse teste por:

```typescript
		test("Erro de negócio migrado é resolvido pelo kind, não por heurística", () => {
			const sut = new TestBaseController()
			// UserAlreadyExistsError agora é DomainError com kind 'conflict'
			const response = sut.respond(failure(new UserAlreadyExistsError()))
			expect(response.status).toBe(409)
		})

		test("Erro técnico (extends Error) sempre gera 500 — sem heurística por nome", () => {
			const sut = new TestBaseController()
			class SomethingNotFoundError extends Error {
				constructor() {
					super("technical lookup failure")
					this.name = "SomethingNotFoundError"
				}
			}
			// Mesmo com nome terminando em NotFoundError, NÃO é DomainError → 500
			const response = sut.respond(failure(new SomethingNotFoundError()))
			expect(response.status).toBe(500)
		})
```

- **Step 3: Rodar o teste para verificar que o segundo falha**

Run: `pnpm --filter backend test:run -- -t "Erro técnico"`
Expected: FAIL — a heurística `endsWith("NotFoundError")` ainda existe e mapeia para 404.

- **Step 4: Remover as heurísticas legadas do BaseController**

Em `apps/backend/src/shared/infra/controller/base-controller.ts`:

1. Remover os sets (linhas ~15-31):

```typescript
const CONFLICT_ERRORS = new Set([
	"BillingCustomerNotProvisionedError",
	"DuplicateWebhookEventError",
	"GymAlreadyExistsError",
	"GymWithCNPJAlreadyExistsError",
	"MaxDistanceError",
	"PasswordUnchangedError",
	"CheckInTimeExceededError",
	"UserAlreadyExistsError",
	"UserHasAlreadyCheckedInToday",
])

const UNAUTHORIZED_ERRORS = new Set([
	"InvalidCredentialsError",
	"InvalidUserTokenError",
	"TokenAlreadyRevokedError",
])
```

2. Simplificar `createResponseByStatus` para:

```typescript
	private createResponseByStatus(error: Error) {
		if (error instanceof DomainError) {
			return ResponseFactory.create({
				status: STATUS_BY_ERROR_KIND[error.kind],
				message: error.message,
			})
		}
		return ResponseFactory.INTERNAL_SERVER_ERROR({
			message: error.message,
		})
	}
```

O restante do BaseController permanece: `parseRequest`, `createResponseError`, hook `mapResponseError`, `createDefaultResponseError` (arrays → 422, ZodError → 400), `createBadRequest`, `createUnprocessableEntity`, `joinErrorMessages`.

- **Step 5: Rodar os testes do BaseController**

Run: `pnpm --filter backend test:run -- -t "BaseController"`
Expected: PASS — todos, incluindo os 2 novos do Step 2.

- **Step 6: Validação completa (gate final das refatorações de erro)**

Run: `pnpm --filter backend biome:fix && pnpm --filter backend tsc:check && pnpm --filter backend test:run && pnpm --filter backend test:business-flow && pnpm --filter backend build && pnpm --filter backend fit:validate-dependencies`
Expected: tudo 100% PASS / zero issues / zero violações.

Se algum business-flow test falhar aqui, significa que um erro de negócio NÃO foi migrado nas tasks 05/06 e dependia de heurística. Corrigir adicionando a migração do erro faltante (mesma transformação das tasks 05/06), NÃO restaurando a heurística.

- **Step 7: Commit**

```bash
git add apps/backend/src/shared/infra/controller/base-controller.ts apps/backend/src/shared/infra/controller/base-controller.test.ts
git commit -m "refactor(shared): remove legacy error-name heuristics from BaseController"
```

## Critérios de Sucesso

- `BaseController` sem sets de strings e sem heurísticas por nome de erro
- Caminho de erro: override → DomainError.kind → ZodError/array → 500
- Erro técnico com nome "enganoso" (ex.: termina em NotFoundError) gera 500, não 404
- Validação completa passa 100%
