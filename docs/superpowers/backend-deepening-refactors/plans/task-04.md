# Task 4: Criar DomainError + ErrorKind + tradução kind→status no BaseController

**Status:** DONE
**PRD:** N/A
**Spec:** `../specs/backend-deepening-refactors-design.md`
**Depends on:** N/A

## Visão Geral

Cria a fundação do mapeamento centralizado de erro → HTTP:

1. `DomainError` abstrata com `kind: ErrorKind` obrigatório (compile-time) em `shared/domain/error/`
2. Tabela única `kind → HTTP status` em `shared/infra/controller/factory/`
3. `BaseController` passa a verificar `instanceof DomainError` ANTES das heurísticas legadas (que continuam como fallback até a task-07)

Esta tarefa é **aditiva**: nenhum erro existente é migrado ainda (tasks 05/06), portanto nenhum comportamento HTTP muda. As heurísticas legadas seguem cobrindo os erros não migrados.

## Arquivos

- Create: `apps/backend/src/shared/domain/error/domain-error.ts`
- Create: `apps/backend/src/shared/domain/error/domain-error.test.ts`
- Create: `apps/backend/src/shared/infra/controller/factory/error-kind-status.ts`
- Modify: `apps/backend/src/shared/infra/controller/base-controller.ts`
- Modify: `apps/backend/src/shared/infra/controller/base-controller.test.ts`

### Conformidade com as Skills Padrão

- test-antipatterns: testes pela interface pública (erro entra → status sai), sem mocks
- typescript-advanced: discriminated literal types para ErrorKind, abstract class com propriedade abstrata readonly
- no-workarounds: heurísticas legadas permanecem como fallback explícito e documentado (removidas na task-07), não como gambiarra escondida

## Passos

Todos os comandos rodam a partir da raiz do monorepo. **Convenções:** indentação tab (Biome), imports internos relativos dentro do mesmo diretório, alias `@/` entre diretórios.

- **Step 1: Escrever o teste do DomainError — deve falhar**

Create `apps/backend/src/shared/domain/error/domain-error.test.ts`:

```typescript
import { DomainError } from "./domain-error"

class FakeConflictError extends DomainError {
	public readonly kind = "conflict"

	constructor() {
		super("Resource already exists")
		this.name = "FakeConflictError"
	}
}

class FakeNotFoundError extends DomainError {
	public readonly kind = "not-found"

	constructor() {
		super("Resource not found")
		this.name = "FakeNotFoundError"
	}
}

describe("DomainError", () => {
	test("Subclasse declara kind e herda de Error", () => {
		const error = new FakeConflictError()
		expect(error).toBeInstanceOf(DomainError)
		expect(error).toBeInstanceOf(Error)
		expect(error.kind).toBe("conflict")
		expect(error.message).toBe("Resource already exists")
		expect(error.name).toBe("FakeConflictError")
	})

	test("Kinds distintos são preservados por subclasse", () => {
		expect(new FakeConflictError().kind).toBe("conflict")
		expect(new FakeNotFoundError().kind).toBe("not-found")
	})

	test("instanceof DomainError distingue erros de negócio de erros técnicos", () => {
		const technical = new Error("connection refused")
		expect(technical).not.toBeInstanceOf(DomainError)
	})
})
```

- **Step 2: Rodar o teste para verificar que falha**

Run: `pnpm --filter backend test:run -- -t "DomainError"`
Expected: FAIL — `Cannot find module './domain-error'`.

- **Step 3: Criar a classe DomainError**

Create `apps/backend/src/shared/domain/error/domain-error.ts`:

```typescript
export const ERROR_KINDS = [
	"conflict",
	"not-found",
	"unauthorized",
	"forbidden",
	"validation",
] as const

export type ErrorKind = (typeof ERROR_KINDS)[number]

/**
 * Base para todo erro de negócio (domain/application).
 * O `kind` declara a categoria semântica do erro — o que ele É,
 * não como vira HTTP. A tradução kind → status é responsabilidade
 * exclusiva de shared/infra/controller/factory/error-kind-status.ts.
 *
 * Erros técnicos (falha de conexão, violação de contrato) NÃO
 * estendem DomainError — continuam estendendo Error.
 */
export abstract class DomainError extends Error {
	public abstract readonly kind: ErrorKind
}
```

- **Step 4: Rodar o teste para verificar que passa**

Run: `pnpm --filter backend test:run -- -t "DomainError"`
Expected: PASS (3 testes).

- **Step 5: Criar a tabela kind → status**

Create `apps/backend/src/shared/infra/controller/factory/error-kind-status.ts`:

```typescript
import type { ErrorKind } from "@/shared/domain/error/domain-error"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"

/**
 * Único ponto do backend que traduz categoria semântica de erro
 * (DomainError.kind) para HTTP status. Controllers e erros de
 * negócio nunca conhecem códigos HTTP diretamente.
 */
export const STATUS_BY_ERROR_KIND: Record<ErrorKind, number> = {
	conflict: HTTP_STATUS.CONFLICT,
	"not-found": HTTP_STATUS.NOT_FOUND,
	unauthorized: HTTP_STATUS.UNAUTHORIZED,
	forbidden: HTTP_STATUS.FORBIDDEN,
	validation: HTTP_STATUS.UNPROCESSABLE_ENTITY,
} as const
```

- **Step 6: Escrever os testes do BaseController kind-aware — devem falhar**

Em `apps/backend/src/shared/infra/controller/base-controller.test.ts`, adicionar dentro do `describe("BaseController", ...)` existente (sem remover os testes atuais):

```typescript
	describe("mapeamento por DomainError.kind", () => {
		class KindConflictError extends DomainError {
			public readonly kind = "conflict"

			constructor() {
				super("Already exists")
				this.name = "KindConflictError"
			}
		}

		class KindForbiddenError extends DomainError {
			public readonly kind = "forbidden"

			constructor() {
				super("Not allowed")
				this.name = "KindForbiddenError"
			}
		}

		class KindNotFoundDomainError extends DomainError {
			public readonly kind = "not-found"

			constructor() {
				super("Missing resource")
				this.name = "KindNotFoundDomainError"
			}
		}

		test("Erro com kind conflict gera 409", () => {
			const sut = new TestBaseController()
			const response = sut.respond(failure(new KindConflictError()))
			expect(response.status).toBe(409)
			expect(response.body).toEqual({ message: "Already exists" })
		})

		test("Erro com kind forbidden gera 403", () => {
			const sut = new TestBaseController()
			const response = sut.respond(failure(new KindForbiddenError()))
			expect(response.status).toBe(403)
			expect(response.body).toEqual({ message: "Not allowed" })
		})

		test("Erro com kind not-found gera 404", () => {
			const sut = new TestBaseController()
			const response = sut.respond(failure(new KindNotFoundDomainError()))
			expect(response.status).toBe(404)
			expect(response.body).toEqual({ message: "Missing resource" })
		})

		test("Erro fora da hierarquia DomainError mantém fallback legado (heurística por nome)", () => {
			const sut = new TestBaseController()
			// UserAlreadyExistsError ainda não migrou para DomainError nesta task —
			// continua coberto pelo Set CONFLICT_ERRORS legado
			const response = sut.respond(failure(new UserAlreadyExistsError()))
			expect(response.status).toBe(409)
		})

		test("Erro técnico desconhecido gera 500", () => {
			const sut = new TestBaseController()
			const response = sut.respond(failure(new Error("boom")))
			expect(response.status).toBe(500)
		})
	})
```

E adicionar o import no topo do arquivo de teste:

```typescript
import { DomainError } from "@/shared/domain/error/domain-error"
```

- **Step 7: Rodar os testes para verificar que falham**

Run: `pnpm --filter backend test:run -- -t "mapeamento por DomainError.kind"`
Expected: FAIL nos 3 primeiros testes (kind conflict/forbidden/not-found) — o BaseController ainda não conhece DomainError. Os 2 últimos (fallback) devem passar.

- **Step 8: Implementar o caminho kind no BaseController**

Em `apps/backend/src/shared/infra/controller/base-controller.ts`:

1. Adicionar imports (após os imports existentes de `@/shared/...`):

```typescript
import { DomainError } from "@/shared/domain/error/domain-error"
import { STATUS_BY_ERROR_KIND } from "./factory/error-kind-status"
```

2. Alterar `createResponseByStatus` (linhas ~87-103) para verificar DomainError ANTES das heurísticas:

```typescript
	private createResponseByStatus(error: Error) {
		if (error instanceof DomainError) {
			return ResponseFactory.create({
				status: STATUS_BY_ERROR_KIND[error.kind],
				message: error.message,
			})
		}
		// Heurísticas legadas — cobrem erros ainda não migrados para DomainError.
		// Removidas na task-07 quando a migração estiver completa.
		if (UNAUTHORIZED_ERRORS.has(error.name)) {
			return ResponseFactory.UNAUTHORIZED({ message: error.message })
		}
		if (error.name.endsWith("NotFoundError")) {
			return ResponseFactory.NOT_FOUND({ message: error.message })
		}
		if (CONFLICT_ERRORS.has(error.name)) {
			return ResponseFactory.CONFLICT({ message: error.message })
		}
		if (error.name.startsWith("Invalid") || error.name === "ValidationError") {
			return this.createUnprocessableEntity(error)
		}
		return ResponseFactory.INTERNAL_SERVER_ERROR({
			message: error.message,
		})
	}
```

(Os Sets `CONFLICT_ERRORS`/`UNAUTHORIZED_ERRORS` e demais métodos permanecem intocados nesta task.)

- **Step 9: Rodar os testes para verificar que passam**

Run: `pnpm --filter backend test:run -- -t "BaseController"`
Expected: PASS — todos os testes (legados + novos do kind).

- **Step 10: Rodar a validação completa**

Run: `pnpm --filter backend biome:fix && pnpm --filter backend tsc:check && pnpm --filter backend test:run`
Expected: biome zero issues, tsc zero erros, testes unitários 100% PASS.

Run: `pnpm --filter backend test:business-flow && pnpm --filter backend build`
Expected: business-flow 100% PASS (nenhum comportamento mudou — nenhum erro migrou ainda), build ok.

- **Step 11: Commit**

```bash
git add apps/backend/src/shared/domain/error/domain-error.ts apps/backend/src/shared/domain/error/domain-error.test.ts apps/backend/src/shared/infra/controller/factory/error-kind-status.ts apps/backend/src/shared/infra/controller/base-controller.ts apps/backend/src/shared/infra/controller/base-controller.test.ts
git commit -m "feat(shared): add DomainError with semantic kind and centralized kind->status translation"
```

## Critérios de Sucesso

- `DomainError` existe com `kind` abstrato obrigatório — subclasse sem `kind` não compila
- `STATUS_BY_ERROR_KIND` é o único lugar com a tabela kind → status
- `BaseController` resolve DomainError pelo kind e mantém fallback legado para erros não migrados
- Zero mudança de comportamento HTTP (nenhum erro migrado ainda)
- Validação completa passa 100%
