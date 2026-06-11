# Task 8: Criar módulo RouteGuard (interface + JwtRouteGuard + testes unitários + binding IoC)

**Status:** DONE
**PRD:** N/A
**Spec:** `../specs/backend-deepening-refactors-design.md`
**Depends on:** N/A

## Visão Geral

Cria o módulo `RouteGuard` em `shared/infra/server/guard/` — o seam único de autenticação/autorização de rotas HTTP. Encapsula atrás de uma interface: verificação de JWT, checagem de role admin e checagem de sessão revogada (hoje espalhadas em 3 handlers criados inline no FastifyAdapter com `container.get()` em construtores).

Esta tarefa é **aditiva**: cria o módulo, testes e binding IoC. A integração no FastifyAdapter (e deleção dos handlers antigos) é a task-09. Nada do comportamento atual muda.

## Arquivos

- Create: `apps/backend/src/shared/infra/server/guard/route-guard.ts`
- Create: `apps/backend/src/shared/infra/server/guard/jwt-route-guard.ts`
- Create: `apps/backend/src/shared/infra/server/guard/jwt-route-guard.test.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/service-identifier/shared-types.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/infra/infra-module.ts`

### Conformidade com as Skills Padrão

- test-antipatterns: testes pela interface (`guard()` recebe dados, retorna Either) com adapters reais (JsonWebTokenAdapter, RevokedTokenDAOMemory) — sem mocks de comportamento
- typescript-advanced: tipos discriminados, Either pattern
- no-workarounds: dependências por injeção de construtor — zero `container.get()` dentro do módulo
- zod: não aplicável (sem validação de schema aqui)

## Passos

Todos os comandos rodam a partir da raiz do monorepo. Indentação: tab (Biome). Imports internos no mesmo diretório: relativos com `.js`.

- **Step 1: Criar a interface RouteGuard e seus tipos**

Create `apps/backend/src/shared/infra/server/guard/route-guard.ts`:

```typescript
import type { Either } from "@/shared/domain/value-object/either"
import type { RoleTypes } from "@/user/domain/value-object/role"

/**
 * Política de acesso declarada pela rota (vem de HandlerOptions).
 */
export interface RoutePolicy {
	isProtected?: boolean
	onlyAdmin?: boolean
}

/**
 * Dados do request necessários para a decisão de acesso.
 * Mantém o guard independente do Fastify.
 */
export interface GuardRequest {
	authorizationHeader?: string
}

/**
 * Payload do usuário autenticado (estrutura do JWT emitido no login).
 */
export interface AuthenticatedUser {
	sub: {
		id: string
		email: string
		role: RoleTypes
		jwi: string
	}
	iat: number
	exp: number
}

/**
 * Rejeição de acesso: status HTTP + mensagem para o reply.
 */
export interface AccessDenied {
	status: number
	message: string
}

/**
 * Seam único de autenticação/autorização de rotas HTTP.
 * O adapter HTTP (FastifyAdapter) apenas traduz request/reply <-> RouteGuard;
 * toda a política de acesso vive atrás desta interface.
 *
 * Contrato:
 * - Rota não protegida -> success(null)
 * - Sem token / token inválido -> failure({ status: 401, message: "Unauthorized" })
 * - onlyAdmin e role !== ADMIN -> failure({ status: 403, message: "Forbidden" })
 * - Sessão revogada -> failure({ status: 401, message: "Session already revoked" })
 * - Acesso permitido -> success(authenticatedUser)
 */
export interface RouteGuard {
	guard(
		request: GuardRequest,
		policy: RoutePolicy,
	): Promise<Either<AccessDenied, AuthenticatedUser | null>>
}
```

- **Step 2: Escrever os testes do JwtRouteGuard — devem falhar**

Create `apps/backend/src/shared/infra/server/guard/jwt-route-guard.test.ts`:

```typescript
import { RevokedTokenDAOMemory } from "@/shared/infra/database/dao/in-memory/revoked-token-dao-memory"
import { env } from "@/shared/infra/env"
import { JsonWebTokenAdapter } from "@/shared/infra/auth/json-web-token-adapter"
import type { Logger } from "@/shared/infra/logger/logger"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"
import { JwtRouteGuard } from "./jwt-route-guard"

const fakeLogger: Logger = {
	error: () => {},
	warn: () => {},
	info: () => {},
}

function makeSut() {
	const authToken = new JsonWebTokenAdapter(fakeLogger)
	const revokedTokenDAO = new RevokedTokenDAOMemory()
	const sut = new JwtRouteGuard(authToken, revokedTokenDAO, fakeLogger)
	return { sut, authToken, revokedTokenDAO }
}

function signToken(
	authToken: JsonWebTokenAdapter,
	overrides?: Partial<{ id: string; email: string; role: string; jwi: string }>,
) {
	return authToken.sign(
		{
			sub: {
				id: overrides?.id ?? "user-1",
				email: overrides?.email ?? "user@test.com",
				role: overrides?.role ?? "MEMBER",
				jwi: overrides?.jwi ?? "jwi-1",
			},
		},
		env.PRIVATE_KEY,
	)
}

describe("JwtRouteGuard", () => {
	test("Rota não protegida retorna success(null) sem verificar token", async () => {
		const { sut } = makeSut()

		const result = await sut.guard({}, { isProtected: false })

		expect(result.isSuccess()).toBe(true)
		expect(result.forceSuccess().value).toBeNull()
	})

	test("Rota protegida sem token retorna 401 Unauthorized", async () => {
		const { sut } = makeSut()

		const result = await sut.guard({}, { isProtected: true })

		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toEqual({
			status: HTTP_STATUS.UNAUTHORIZED,
			message: "Unauthorized",
		})
	})

	test("Rota protegida com token inválido retorna 401 Unauthorized", async () => {
		const { sut } = makeSut()

		const result = await sut.guard(
			{ authorizationHeader: "Bearer invalid.token.here" },
			{ isProtected: true },
		)

		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toEqual({
			status: HTTP_STATUS.UNAUTHORIZED,
			message: "Unauthorized",
		})
	})

	test("Rota protegida com token válido retorna o usuário autenticado", async () => {
		const { sut, authToken } = makeSut()
		const token = signToken(authToken, { id: "user-42", role: "MEMBER" })

		const result = await sut.guard(
			{ authorizationHeader: `Bearer ${token}` },
			{ isProtected: true },
		)

		expect(result.isSuccess()).toBe(true)
		const user = result.forceSuccess().value
		expect(user?.sub.id).toBe("user-42")
		expect(user?.sub.role).toBe("MEMBER")
		expect(user?.iat).toEqual(expect.any(Number))
	})

	test("Rota onlyAdmin com role MEMBER retorna 403 Forbidden", async () => {
		const { sut, authToken } = makeSut()
		const token = signToken(authToken, { role: "MEMBER" })

		const result = await sut.guard(
			{ authorizationHeader: `Bearer ${token}` },
			{ isProtected: true, onlyAdmin: true },
		)

		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toEqual({
			status: HTTP_STATUS.FORBIDDEN,
			message: "Forbidden",
		})
	})

	test("Rota onlyAdmin com role ADMIN retorna o usuário autenticado", async () => {
		const { sut, authToken } = makeSut()
		const token = signToken(authToken, { role: "ADMIN" })

		const result = await sut.guard(
			{ authorizationHeader: `Bearer ${token}` },
			{ isProtected: true, onlyAdmin: true },
		)

		expect(result.isSuccess()).toBe(true)
		expect(result.forceSuccess().value?.sub.role).toBe("ADMIN")
	})

	test("Sessão revogada por jwi retorna 401 Session already revoked", async () => {
		const { sut, authToken, revokedTokenDAO } = makeSut()
		const token = signToken(authToken, { jwi: "revoked-jwi" })
		await revokedTokenDAO.revoke({
			jwi: "revoked-jwi",
			userId: "user-1",
			revokedAt: new Date().toISOString(),
			expiresIn: "7d",
		})

		const result = await sut.guard(
			{ authorizationHeader: `Bearer ${token}` },
			{ isProtected: true },
		)

		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toEqual({
			status: HTTP_STATUS.UNAUTHORIZED,
			message: "Session already revoked",
		})
	})

	test("Sessão revogada em massa (revokeAllForUser) invalida tokens emitidos antes", async () => {
		const { sut, authToken, revokedTokenDAO } = makeSut()
		const token = signToken(authToken, { id: "user-mass-revoke" })
		// revokeAllForUser registra o timestamp atual; o token acabou de ser
		// emitido (iat <= revokedAfter), então deve ser rejeitado
		await revokedTokenDAO.revokeAllForUser("user-mass-revoke", 60)

		const result = await sut.guard(
			{ authorizationHeader: `Bearer ${token}` },
			{ isProtected: true },
		)

		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toEqual({
			status: HTTP_STATUS.UNAUTHORIZED,
			message: "Session already revoked",
		})
	})
})
```

- **Step 3: Rodar os testes para verificar que falham**

Run: `pnpm --filter backend test:run -- -t "JwtRouteGuard"`
Expected: FAIL — `Cannot find module './jwt-route-guard'`.

- **Step 4: Implementar o JwtRouteGuard**

Create `apps/backend/src/shared/infra/server/guard/jwt-route-guard.ts`:

```typescript
import { inject, injectable } from "inversify"
import type { RevokedTokenDAO } from "@/session/application/dao/revoked-token-dao"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import { env } from "@/shared/infra/env"
import { AUTH_TYPES, SHARED_TYPES } from "@/shared/infra/ioc/types"
import type { Logger } from "@/shared/infra/logger/logger"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"
import type { AuthToken } from "@/user/application/auth/auth-token"
import { RoleValues } from "@/user/domain/value-object/role"
import type {
	AccessDenied,
	AuthenticatedUser,
	GuardRequest,
	RouteGuard,
	RoutePolicy,
} from "./route-guard.js"

@injectable()
export class JwtRouteGuard implements RouteGuard {
	constructor(
		@inject(SHARED_TYPES.Tokens.Auth)
		private readonly authToken: AuthToken,
		@inject(AUTH_TYPES.DAO.RevokedToken)
		private readonly revokedTokenDAO: RevokedTokenDAO,
		@inject(SHARED_TYPES.Logger)
		private readonly logger: Logger,
	) {}

	public async guard(
		request: GuardRequest,
		policy: RoutePolicy,
	): Promise<Either<AccessDenied, AuthenticatedUser | null>> {
		if (!policy.isProtected) return success(null)
		const userOrDenied = this.authenticate(request)
		if (userOrDenied.isFailure()) return failure(userOrDenied.value)
		const user = userOrDenied.forceSuccess().value
		const adminDenied = this.checkAdminRole(user, policy)
		if (adminDenied) return failure(adminDenied)
		const revokedDenied = await this.checkSessionRevoked(user)
		if (revokedDenied) return failure(revokedDenied)
		return success(user)
	}

	private authenticate(
		request: GuardRequest,
	): Either<AccessDenied, AuthenticatedUser> {
		if (!request.authorizationHeader) {
			this.logger.warn(this, "No token provided")
			return failure(JwtRouteGuard.unauthorized())
		}
		const [, token] = request.authorizationHeader.split("Bearer ")
		const verifiedOrError = this.authToken.verify<AuthenticatedUser>(
			token,
			env.PRIVATE_KEY,
		)
		if (verifiedOrError.isFailure()) {
			this.logger.warn(this, {
				message: "Token verification failed",
				error: verifiedOrError.value,
			})
			return failure(JwtRouteGuard.unauthorized())
		}
		return success(verifiedOrError.forceSuccess().value)
	}

	private checkAdminRole(
		user: AuthenticatedUser,
		policy: RoutePolicy,
	): AccessDenied | undefined {
		if (!policy.onlyAdmin) return undefined
		if (user.sub.role === RoleValues.ADMIN) return undefined
		this.logger.warn(this, {
			message: "User is not an admin",
			role: user.sub.role,
		})
		return {
			status: HTTP_STATUS.FORBIDDEN,
			message: "Forbidden",
		}
	}

	private async checkSessionRevoked(
		user: AuthenticatedUser,
	): Promise<AccessDenied | undefined> {
		const sessionFound = await this.revokedTokenDAO.revokedTokenById(
			user.sub.jwi,
		)
		if (sessionFound) return JwtRouteGuard.sessionRevoked()
		const revokedAfter = await this.revokedTokenDAO.revokedAfterForUser(
			user.sub.id,
		)
		if (revokedAfter !== null && user.iat <= revokedAfter) {
			return JwtRouteGuard.sessionRevoked()
		}
		return undefined
	}

	private static unauthorized(): AccessDenied {
		return {
			status: HTTP_STATUS.UNAUTHORIZED,
			message: "Unauthorized",
		}
	}

	private static sessionRevoked(): AccessDenied {
		return {
			status: HTTP_STATUS.UNAUTHORIZED,
			message: "Session already revoked",
		}
	}
}
```

- **Step 5: Rodar os testes para verificar que passam**

Run: `pnpm --filter backend test:run -- -t "JwtRouteGuard"`
Expected: PASS — 8 testes.

- **Step 6: Registrar o symbol e o binding IoC**

Em `apps/backend/src/shared/infra/ioc/module/service-identifier/shared-types.ts`, adicionar dentro do objeto `SHARED_TYPES` (após `Cookies`):

```typescript
	Server: {
		Fastify: Symbol.for("FastifyServer"),
		RouteGuard: Symbol.for("RouteGuard"),
	},
```

(O symbol entra no grupo `Server` existente — apenas adicionar a linha `RouteGuard: Symbol.for("RouteGuard"),`.)

Em `apps/backend/src/shared/infra/ioc/module/infra/infra-module.ts`:

1. Adicionar import:

```typescript
import { JwtRouteGuard } from "@/shared/infra/server/guard/jwt-route-guard"
```

2. Adicionar binding (junto aos bindings de Server, antes de `bind(SHARED_TYPES.Server.Fastify)`):

```typescript
	bind(SHARED_TYPES.Server.RouteGuard).to(JwtRouteGuard).inSingletonScope()
```

- **Step 7: Validação completa**

Run: `pnpm --filter backend biome:fix && pnpm --filter backend tsc:check && pnpm --filter backend test:run && pnpm --filter backend test:business-flow && pnpm --filter backend build && pnpm --filter backend fit:validate-dependencies`
Expected: tudo 100% PASS / zero issues. (O guard ainda não é usado pelo FastifyAdapter — comportamento HTTP inalterado.)

- **Step 8: Commit**

```bash
git add apps/backend/src/shared/infra/server/guard apps/backend/src/shared/infra/ioc/module/service-identifier/shared-types.ts apps/backend/src/shared/infra/ioc/module/infra/infra-module.ts
git commit -m "feat(shared): add RouteGuard module with JWT authentication and authorization policy"
```

## Critérios de Sucesso

- `RouteGuard` interface + `JwtRouteGuard` implementação em `shared/infra/server/guard/`
- 8 testes unitários passando SEM Fastify e SEM mocks de comportamento (adapters reais in-memory)
- Zero `container.get()` dentro do módulo — dependências 100% via construtor
- Symbol `SHARED_TYPES.Server.RouteGuard` registrado e binding singleton no infra-module
- Validação completa passa 100%; comportamento HTTP inalterado (integração é a task-09)
