# Task 5: Migrar 27 erros User+Session para DomainError e tratar overrides desses controllers

**Status:** DONE
**PRD:** N/A
**Spec:** `../specs/backend-deepening-refactors-design.md`
**Depends on:** task-04

## Visão Geral

Migra todos os erros de negócio dos contextos **User** e **Session** para `DomainError` (com `kind`), remove os overrides `mapResponseError()` que ficam redundantes nos controllers desses contextos e atualiza os business-flow tests cujas assertions mudam (correções de inconsistência da spec R1.5).

**Regra de overrides:** um override sobrevive somente se produz body que o default por kind não produz (campo `code:`, mensagens contextuais). Overrides que só re-mapeiam status são removidos.

## Arquivos

**Erros User — application (Modify, 17 arquivos):**
- `apps/backend/src/user/application/error/cannot-delete-self-error.ts`
- `apps/backend/src/user/application/error/cannot-demote-self-error.ts`
- `apps/backend/src/user/application/error/external-provider-not-linked-error.ts`
- `apps/backend/src/user/application/error/invalid-credentials-error.ts`
- `apps/backend/src/user/application/error/invalid-reset-token-error.ts`
- `apps/backend/src/user/application/error/invalid-user-token-error.ts`
- `apps/backend/src/user/application/error/password-already-set-error.ts`
- `apps/backend/src/user/application/error/password-not-set-error.ts`
- `apps/backend/src/user/application/error/password-unchanged-error.ts`
- `apps/backend/src/user/application/error/reauth-grant-invalid-error.ts`
- `apps/backend/src/user/application/error/user-already-admin-error.ts`
- `apps/backend/src/user/application/error/user-already-exists-error.ts`
- `apps/backend/src/user/application/error/user-has-already-checked-in-today.ts`
- `apps/backend/src/user/application/error/user-is-not-active-error.ts`
- `apps/backend/src/user/application/error/user-is-not-admin-error.ts`
- `apps/backend/src/user/application/error/user-is-super-admin-error.ts`
- `apps/backend/src/user/application/error/user-not-found-error.ts`

**Erros User — domain (Modify, 5 arquivos):**
- `apps/backend/src/user/domain/error/invalid-email-error.ts`
- `apps/backend/src/user/domain/error/invalid-name-length-error.ts`
- `apps/backend/src/user/domain/error/invalid-phone-number-error.ts`
- `apps/backend/src/user/domain/error/user-missing-authentication-method-error.ts`
- `apps/backend/src/user/domain/value-object/google-id.ts` (classe `InvalidGoogleIdError` inline)

**Erros Session (Modify, 5 arquivos):**
- `apps/backend/src/session/application/error/external-provider-link-required-error.ts`
- `apps/backend/src/session/application/error/google-account-already-linked-error.ts`
- `apps/backend/src/session/application/error/google-email-not-verified-error.ts`
- `apps/backend/src/session/application/error/invalid-google-token-error.ts`
- `apps/backend/src/session/application/error/token-already-revoked-error.ts`

**Controllers — overrides removidos (Modify, 7 arquivos):**
- `apps/backend/src/user/infra/controller/delete-user.controller.ts`
- `apps/backend/src/user/infra/controller/update-my-profile.controller.ts`
- `apps/backend/src/user/infra/controller/activate-user.controller.ts`
- `apps/backend/src/user/infra/controller/suspend-user.controller.ts`
- `apps/backend/src/user/infra/controller/update-user-profile.controller.ts`
- `apps/backend/src/user/infra/controller/promote-to-admin.controller.ts`
- `apps/backend/src/user/infra/controller/demote-from-admin.controller.ts`

**Controllers — overrides MANTIDOS INTACTOS (não tocar, 7 arquivos):**
- `logout.controller.ts` (mensagem fixa "Session already revoked" é contrato de API, assertada em logout.business-flow-test.ts:112)
- `authenticate.controller.ts`, `authenticate-with-google.controller.ts`, `change-password.controller.ts`, `create-password-reauth-grant.controller.ts`, `define-password.controller.ts`, `reset-password.controller.ts`

**Testes — assertions atualizadas (Modify):**
- `apps/backend/src/user/infra/controller/activate-user.business-flow-test.ts`
- Business-flow tests de suspend-user, update-user-profile, promote-to-admin, demote-from-admin (conforme falhas na execução — ver Step 6)

### Conformidade com as Skills Padrão

- refactoring: mudança mecânica de superclasse + remoção de código redundante
- test-antipatterns: assertions atualizadas refletem o NOVO contrato correto, não acomodam bugs
- no-workarounds: nenhum erro fica "meio migrado"; sem casts

## Passos

Todos os comandos rodam a partir da raiz do monorepo. Indentação: tab (Biome).

- **Step 1: Migrar os erros — padrão de transformação**

Cada arquivo de erro sofre a MESMA transformação de 3 partes: (a) import do DomainError, (b) `extends Error` → `extends DomainError`, (c) declarar `public readonly kind`. Exemplos cobrindo todas as variantes existentes:

**Variante 1 — construtor com ErrorOptions** (`user-not-found-error.ts`):

```typescript
// ANTES
export class UserNotFoundError extends Error {
	constructor(errorOptions?: ErrorOptions) {
		super("User not found", errorOptions)
		this.name = "UserNotFoundError"
	}
}

// DEPOIS
import { DomainError } from "@/shared/domain/error/domain-error"

export class UserNotFoundError extends DomainError {
	public readonly kind = "not-found"

	constructor(errorOptions?: ErrorOptions) {
		super("User not found", errorOptions)
		this.name = "UserNotFoundError"
	}
}
```

**Variante 2 — construtor sem argumentos** (`invalid-credentials-error.ts`):

```typescript
// ANTES
export class InvalidCredentialsError extends Error {
	constructor() {
		super("Invalid Credentials")
		this.name = "InvalidCredentialsError"
	}
}

// DEPOIS
import { DomainError } from "@/shared/domain/error/domain-error"

export class InvalidCredentialsError extends DomainError {
	public readonly kind = "unauthorized"

	constructor() {
		super("Invalid Credentials")
		this.name = "InvalidCredentialsError"
	}
}
```

**Variante 3 — `readonly name` como propriedade** (`token-already-revoked-error.ts`):

```typescript
// ANTES
export class TokenAlreadyRevokedError extends Error {
	readonly name = "TokenAlreadyRevokedError"

	constructor(sessionId?: string, cause?: ErrorOptions) {
		super(`Token with ID ${sessionId} has already been revoked`, cause)
	}
}

// DEPOIS
import { DomainError } from "@/shared/domain/error/domain-error"

export class TokenAlreadyRevokedError extends DomainError {
	readonly name = "TokenAlreadyRevokedError"
	public readonly kind = "unauthorized"

	constructor(sessionId?: string, cause?: ErrorOptions) {
		super(`Token with ID ${sessionId} has already been revoked`, cause)
	}
}
```

**Variante 4 — classe inline em arquivo de value object** (`google-id.ts`, classe `InvalidGoogleIdError`): aplicar a mesma transformação apenas na classe de erro, mantendo o restante do arquivo intacto. O import do DomainError entra no topo do arquivo.

Aplicar a transformação em TODOS os 27 arquivos com os kinds da tabela:

| Arquivo | Classe | kind |
|---|---|---|
| user/application/error/cannot-delete-self-error.ts | CannotDeleteSelfError | `forbidden` |
| user/application/error/cannot-demote-self-error.ts | CannotDemoteSelfError | `forbidden` |
| user/application/error/external-provider-not-linked-error.ts | ExternalProviderNotLinkedError | `conflict` |
| user/application/error/invalid-credentials-error.ts | InvalidCredentialsError | `unauthorized` |
| user/application/error/invalid-reset-token-error.ts | InvalidResetTokenError | `unauthorized` |
| user/application/error/invalid-user-token-error.ts | InvalidUserTokenError | `unauthorized` |
| user/application/error/password-already-set-error.ts | PasswordAlreadySetError | `conflict` |
| user/application/error/password-not-set-error.ts | PasswordNotSetError | `conflict` |
| user/application/error/password-unchanged-error.ts | PasswordUnchangedError | `conflict` |
| user/application/error/reauth-grant-invalid-error.ts | ReauthGrantInvalidError | `unauthorized` |
| user/application/error/user-already-admin-error.ts | UserAlreadyAdminError | `conflict` |
| user/application/error/user-already-exists-error.ts | UserAlreadyExistsError | `conflict` |
| user/application/error/user-has-already-checked-in-today.ts | UserHasAlreadyCheckedInToday | `conflict` |
| user/application/error/user-is-not-active-error.ts | UserIsNotActiveError | `forbidden` |
| user/application/error/user-is-not-admin-error.ts | UserIsNotAdminError | `conflict` |
| user/application/error/user-is-super-admin-error.ts | UserIsSuperAdminError | `forbidden` |
| user/application/error/user-not-found-error.ts | UserNotFoundError | `not-found` |
| user/domain/error/invalid-email-error.ts | InvalidEmailError | `validation` |
| user/domain/error/invalid-name-length-error.ts | InvalidNameLengthError | `validation` |
| user/domain/error/invalid-phone-number-error.ts | InvalidPhoneNumberError | `validation` |
| user/domain/error/user-missing-authentication-method-error.ts | UserMissingAuthenticationMethodError | `validation` |
| user/domain/value-object/google-id.ts | InvalidGoogleIdError | `validation` |
| session/application/error/external-provider-link-required-error.ts | ExternalProviderLinkRequiredError | `conflict` |
| session/application/error/google-account-already-linked-error.ts | GoogleAccountAlreadyLinkedError | `conflict` |
| session/application/error/google-email-not-verified-error.ts | GoogleEmailNotVerifiedError | `validation` |
| session/application/error/invalid-google-token-error.ts | InvalidGoogleTokenError | `unauthorized` |
| session/application/error/token-already-revoked-error.ts | TokenAlreadyRevokedError | `unauthorized` |

- **Step 2: Rodar testes unitários (verificação intermediária)**

Run: `pnpm --filter backend tsc:check && pnpm --filter backend test:run`
Expected: PASS — a migração preserva nome, mensagem e identidade de classe; testes unitários que usam `toBeInstanceOf(...)` ou `error.name` continuam passando.

- **Step 3: Remover overrides redundantes — comportamento idêntico (2 controllers)**

> NOTA sobre o logout.controller.ts: seu override mapeia TokenAlreadyRevokedError → 401, que coincide com o kind `unauthorized`. PORÉM o body customizado `{ message: "Session already revoked" }` difere da mensagem do erro (`"Token with ID <jwi> has already been revoked"`), e logout.business-flow-test.ts:112 asserta essa mensagem fixa. Pelo critério "body customizado = mantém", o override do logout **fica intacto** — não tocar nele.

Em cada um dos 2 controllers abaixo, **deletar o método `mapResponseError()` completo** e remover imports que ficarem órfãos (ResponseFactory, ZodError, classes de erro — apenas se não usados em outro lugar do arquivo):

`apps/backend/src/user/infra/controller/delete-user.controller.ts` (linhas ~63-79) — remover (CannotDeleteSelfError→403, UserIsSuperAdminError→403, UserNotFoundError→404 são exatamente os kinds):

```typescript
	protected override mapResponseError(
		error: Error | Error[],
	): HandleCallbackResponse | undefined {
		if (Array.isArray(error) || error instanceof ZodError) {
			return undefined
		}
		if (
			error instanceof CannotDeleteSelfError ||
			error instanceof UserIsSuperAdminError
		) {
			return ResponseFactory.FORBIDDEN({ message: error.message })
		}
		if (error instanceof UserNotFoundError) {
			return ResponseFactory.NOT_FOUND({ message: error.message })
		}
		return undefined
	}
```

`apps/backend/src/user/infra/controller/update-my-profile.controller.ts` — remover (`*NotFoundError` → 404 = kind not-found):

```typescript
	protected override mapResponseError(
		error: Error | Error[],
	): HandleCallbackResponse | undefined {
		if (Array.isArray(error) || error instanceof ZodError) {
			return undefined
		}
		if (error.name.endsWith("NotFoundError")) {
			return ResponseFactory.create({
				status: 404,
				body: { message: error.message },
			})
		}
		return undefined
	}
```

Após remover cada override, remover também os imports órfãos no topo do arquivo (ex.: `import { ZodError } from "zod"`, `import { ResponseFactory } from ...`, `import { CannotDeleteSelfError } from ...`) — somente se não forem usados em outras partes do arquivo. O `pnpm --filter backend biome:fix` acusa imports não usados.

- **Step 4: Remover overrides que corrigem inconsistência (5 controllers)**

Mesma operação de deleção do `mapResponseError()` completo + imports órfãos em:

`apps/backend/src/user/infra/controller/activate-user.controller.ts` (linhas ~60-74):

```typescript
	protected override mapResponseError(
		error: Error | Error[],
	): HandleCallbackResponse | undefined {
		if (Array.isArray(error) || error instanceof ZodError) {
			return undefined
		}

		if (error.name.endsWith("NotFoundError")) {
			return ResponseFactory.UNPROCESSABLE_ENTITY({
				message: error.message,
			})
		}

		return undefined
	}
```

`apps/backend/src/user/infra/controller/suspend-user.controller.ts` — override idêntico ao de activate-user (NotFound → 422). Remover.

`apps/backend/src/user/infra/controller/update-user-profile.controller.ts` — override idêntico (NotFound → 422). Remover.

`apps/backend/src/user/infra/controller/promote-to-admin.controller.ts` — override que mapeia TUDO → 422:

```typescript
	protected override mapResponseError(
		error: Error | Error[],
	): HandleCallbackResponse | undefined {
		if (Array.isArray(error) || error instanceof ZodError) {
			return undefined
		}
		return ResponseFactory.UNPROCESSABLE_ENTITY({ message: error.message })
	}
```

`apps/backend/src/user/infra/controller/demote-from-admin.controller.ts` — override idêntico ao de promote (TUDO → 422). Remover.

**Mudanças de comportamento resultantes (esperadas, spec R1.5):**

| Controller | Erro | Antes | Depois |
|---|---|---|---|
| activate-user, suspend-user, update-user-profile | UserNotFoundError | 422 | 404 |
| promote-to-admin | UserNotFoundError | 422 | 404 |
| promote-to-admin | UserAlreadyAdminError | 422 | 409 |
| demote-from-admin | UserNotFoundError | 422 | 404 |
| demote-from-admin | CannotDemoteSelfError | 422 | 403 |
| demote-from-admin | UserIsNotAdminError | 422 | 409 |

- **Step 5: NÃO tocar nos 7 controllers com body customizado**

Verificar que estes arquivos NÃO foram modificados (eles mantêm `code:` fields e mensagens contextuais — contrato de API com o frontend):

Run: `git diff --name-only apps/backend/src | grep -E "logout\.controller|authenticate\.controller|authenticate-with-google|change-password|create-password-reauth-grant|define-password|reset-password"`
Expected: saída vazia.

- **Step 6: Rodar business-flow tests e atualizar assertions**

Run: `pnpm --filter backend test:business-flow`
Expected: FALHAS APENAS nos testes que assertam os status antigos da tabela do Step 4.

Atualizações conhecidas:

`apps/backend/src/user/infra/controller/activate-user.business-flow-test.ts` linha ~94:

```typescript
// ANTES
		expect(response.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY)
// DEPOIS
		expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
```

Para cada outra falha: localizar a assertion, confirmar que a mudança consta na tabela do Step 4 (ex.: 422 → 404 para user inexistente, 422 → 409 para já-admin, 422 → 403 para demote de si mesmo) e atualizar o `HTTP_STATUS.X` esperado. **Qualquer falha que NÃO conste na tabela é regressão — parar e investigar com a skill systematic-debugging, não ajustar o teste.**

Run: `pnpm --filter backend test:business-flow`
Expected: 100% PASS após as atualizações.

- **Step 7: Validação completa**

Run: `pnpm --filter backend biome:fix && pnpm --filter backend tsc:check && pnpm --filter backend test:run && pnpm --filter backend test:business-flow && pnpm --filter backend build`
Expected: tudo 100% PASS / zero issues.

- **Step 8: Commit**

```bash
git add -A apps/backend/src
git commit -m "refactor(user,session): migrate errors to DomainError kinds and drop redundant error mapping overrides"
```

## Critérios de Sucesso

- 27 classes de erro de User/Session estendem `DomainError` com o `kind` da tabela
- 7 overrides removidos (delete-user, update-my-profile, activate-user, suspend-user, update-user-profile, promote-to-admin, demote-from-admin)
- 7 controllers com body customizado intactos (incluindo logout)
- Business-flow tests atualizados apenas conforme tabela R1.5; nenhuma outra assertion alterada
- Validação completa passa 100%
