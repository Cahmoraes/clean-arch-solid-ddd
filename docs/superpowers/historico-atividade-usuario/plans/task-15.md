# Task 15: GET /users/:id/activity — controller + rota + DI [FR-001]

**Status:** DONE
**PRD:** `../prd/prd-historico-atividade-usuario.md`
**Spec:** `../specs/historico-atividade-usuario-design.md`
**Tier:** standard
**Depends on:** task-12, task-14

## Visão Geral

Expor `GetUserActivityUseCase` (task 14) via `GET /users/:userId/activity`, protegida e restrita a administradores (a aba "Atividade" só existe na visão admin do modal de detalhes do usuário). Segue exatamente o padrão de `UserProfileController` (`user/infra/controller/user-profile.controller.ts`): `BaseController`, `parseRequest`/`createResponseError`, registro da rota via `HttpServer`. Como `userProfileRequestSchema` não é exportado por `user-profile.controller.ts`, este controller declara seu próprio schema local equivalente (FR-001).

**Depende de task-12** porque ambas editam `shared/infra/ioc/module/service-identifier/user-types.ts`, `shared/infra/ioc/module/user/user-module.ts` e `bootstrap/setup-user-module.ts` — rodar em paralelo causaria conflito de merge nesses três arquivos compartilhados.

## Arquivos

- Create: `apps/backend/src/user/infra/controller/get-user-activity.controller.ts`
- Modify: `apps/backend/src/user/infra/controller/routes/user-routes.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/service-identifier/user-types.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/user/user-module.ts`
- Modify: `apps/backend/src/bootstrap/setup-user-module.ts`
- Test: `apps/backend/src/user/infra/controller/get-user-activity.business-flow-test.ts`

### Conformidade com as Skills Padrão

- `typescript-advanced`: o schema local `getUserActivityRequestSchema` (zod) precisa inferir o mesmo shape `{ userId: string }` usado pela use case.
- `test-antipatterns`: o teste business-flow sobe o servidor Fastify real via `serverBuildForTest()` e usa `supertest`, sem mockar a camada HTTP.

## Passos

- **Step 1: Escrever o teste falhando**

```typescript
// apps/backend/src/user/infra/controller/get-user-activity.business-flow-test.ts
import { randomUUID } from "node:crypto"
import request from "supertest"
import { createAndSaveUser } from "test/factory/create-and-save-user"
import { serverBuildForTest } from "test/factory/server-build-for-test"
import type { AuthenticateUseCase } from "@/session/application/use-case/authenticate.usecase"
import { InMemoryUserActivityDao } from "@/shared/infra/database/dao/in-memory/user-activity-dao-memory"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { AUTH_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"
import { UserRoutes } from "./routes/user-routes"

describe("Buscar Histórico de Atividade do Usuário", () => {
	let fastifyServer: FastifyAdapter | undefined
	let userRepository: InMemoryUserRepository
	let authenticate: AuthenticateUseCase
	let adminToken: string

	beforeEach(async () => {
		container.snapshot()
		userRepository = new InMemoryUserRepository()
		container
			.rebind(USER_TYPES.Repositories.User)
			.toConstantValue(userRepository)
	})

	afterEach(async () => {
		container.restore()
		if (fastifyServer) await fastifyServer.close()
	})

	// Sobe o servidor e autentica o admin DEPOIS de qualquer rebind necessário
	// para o teste (ex: DAO.UserActivity) — o container Inversify instancia a
	// cadeia controller→use case→DAO no momento em que serverBuildForTest()
	// resolve os controllers, então um rebind feito DEPOIS desse ponto não
	// alcança a instância já montada. Chamar isto por último em cada teste.
	async function bootServerAndAuthenticateAdmin(): Promise<void> {
		fastifyServer = await serverBuildForTest()
		await fastifyServer.ready()
		authenticate = container.get<AuthenticateUseCase>(
			AUTH_TYPES.UseCases.Authenticate,
		)
		await createAndSaveUser({
			userRepository,
			id: randomUUID(),
			email: "admin@activity.test",
			password: "any_password",
			role: "ADMIN",
			isSuperAdmin: true,
		})
		const result = await authenticate.execute({
			email: "admin@activity.test",
			password: "any_password",
		})
		adminToken = result.force.success().value.token
	}

	test("deve retornar 200 com a lista de eventos de atividade", async () => {
		const targetId = randomUUID()
		const occurredAt = new Date("2025-01-10T12:00:00.000Z")
		container.rebind(USER_TYPES.DAO.UserActivity).toConstantValue(
			new InMemoryUserActivityDao([
				{
					id: "activity-1",
					type: "LOGIN",
					description: "Login realizado",
					occurredAt,
				},
			]),
		)
		await bootServerAndAuthenticateAdmin()
		await createAndSaveUser({ userRepository, id: targetId, email: "target@activity.test" })

		const response = await request(fastifyServer.server)
			.get(`/users/${targetId}/activity`)
			.set("Authorization", `Bearer ${adminToken}`)

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body.events).toEqual([
			{
				id: "activity-1",
				type: "LOGIN",
				description: "Login realizado",
				occurredAt: occurredAt.toISOString(),
			},
		])
	})

	test("deve retornar 403 quando o solicitante não é admin", async () => {
		await bootServerAndAuthenticateAdmin()
		const targetId = randomUUID()
		await createAndSaveUser({ userRepository, id: targetId, email: "target2@activity.test" })
		await createAndSaveUser({
			userRepository,
			id: randomUUID(),
			email: "member@activity.test",
			password: "member_password",
			role: "MEMBER",
		})
		const memberResult = await authenticate.execute({
			email: "member@activity.test",
			password: "member_password",
		})
		const memberToken = memberResult.force.success().value.token

		const response = await request(fastifyServer.server)
			.get(`/users/${targetId}/activity`)
			.set("Authorization", `Bearer ${memberToken}`)

		expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
	})

	test("deve retornar 404 quando o usuário alvo não existe", async () => {
		await bootServerAndAuthenticateAdmin()

		const response = await request(fastifyServer.server)
			.get(`/users/${randomUUID()}/activity`)
			.set("Authorization", `Bearer ${adminToken}`)

		expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
	})
})
```

- **Step 2: Rodar o teste e confirmar a falha**

Run: `npx vitest run --config ./test/vite.config.business-flow.ts src/user/infra/controller/get-user-activity.business-flow-test.ts` (a partir de `apps/backend/`)
Expected: FAIL — 404 genérico do Fastify (rota `/users/:userId/activity` ainda não registrada) e/ou erro de módulo não encontrado.

- **Step 3: Implementação mínima**

Em `apps/backend/src/user/infra/controller/routes/user-routes.ts`, adicionar `ACTIVITY`:

```typescript
const PREFIX = "/users"

export const UserRoutes = {
	CREATE: PREFIX,
	FETCH: PREFIX,
	STATS: `${PREFIX}/stats`,
	PROFILE: `${PREFIX}/:userId`,
	ACTIVITY: `${PREFIX}/:userId/activity`,
	ME: `${PREFIX}/me`,
	METRICS: `${PREFIX}/me/metrics`,
	CHANGE_PASSWORD: `${PREFIX}/me/change-password`,
	PASSWORD_REAUTH: `${PREFIX}/me/password/reauth`,
	PASSWORD: `${PREFIX}/me/password`,
	FORGOT_PASSWORD: "/password/forgot",
	RESET_PASSWORD: "/password/reset",
	ACTIVATE_USER: `${PREFIX}/activate`,
	SUSPEND_USER: `${PREFIX}/suspend`,
	BULK_ACTIVATE_USERS: `${PREFIX}/bulk-activate`,
	BULK_DEACTIVATE_USERS: `${PREFIX}/bulk-deactivate`,
	PROMOTE_TO_ADMIN: `${PREFIX}/promote-admin`,
	DEMOTE_FROM_ADMIN: `${PREFIX}/demote-admin`,
	DELETE: `${PREFIX}/:userId`,
} as const

export type UserRoutesType = (typeof UserRoutes)[keyof typeof UserRoutes]
```

Criar o controller:

```typescript
// apps/backend/src/user/infra/controller/get-user-activity.controller.ts
import type { FastifyRequest } from "fastify"
import { inject } from "inversify"
import { z } from "zod"
import { BaseController } from "@/shared/infra/controller/base-controller"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory"
import { Logger } from "@/shared/infra/decorator/logger"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type { HttpServer, Schema } from "@/shared/infra/server/http-server"
import type { GetUserActivityUseCase } from "@/user/application/use-case/get-user-activity.usecase"
import { UserRoutes } from "./routes/user-routes"

const getUserActivityRequestSchema = z.object({
	userId: z.string().meta({ description: "User ID", example: "uuid-1234" }),
})

export type GetUserActivityPayload = z.infer<typeof getUserActivityRequestSchema>

export class GetUserActivityController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly server: HttpServer,
		@inject(USER_TYPES.UseCases.GetUserActivity)
		private readonly getUserActivity: GetUserActivityUseCase,
	) {
		super()
		this.bindMethods()
	}

	private bindMethods() {
		this.callback = this.callback.bind(this)
	}

	@Logger({ message: "✅ | 🔒" })
	async init() {
		this.server.register(
			"get",
			UserRoutes.ACTIVITY,
			{
				callback: this.callback,
				isProtected: true,
				onlyAdmin: true,
			},
			makeGetUserActivitySwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest) {
		const parseParamsResult = this.parseRequest(
			getUserActivityRequestSchema,
			req.params,
		)
		if (parseParamsResult.isFailure()) {
			return this.createResponseError(parseParamsResult)
		}

		const result = await this.getUserActivity.execute({
			userId: parseParamsResult.value.userId,
		})
		if (result.isFailure()) {
			return this.createResponseError(result)
		}

		return ResponseFactory.create({
			status: 200,
			body: result.value,
		})
	}
}

const ACTIVITY_EVENT_TYPES = [
	"LOGIN",
	"PASSWORD_CHANGED",
	"ACCOUNT_LOCKED",
	"GOOGLE_LINKED",
	"PROFILE_UPDATED",
	"ROLE_CHANGED",
	"STATUS_CHANGED",
	"CHECK_IN",
] as const

const activityEventResponseSchema = z.object({
	id: z.string(),
	type: z.enum(ACTIVITY_EVENT_TYPES),
	description: z.string(),
	occurredAt: z.string(),
})

const getUserActivityResponseSchema = z.object({
	events: z.array(activityEventResponseSchema),
})

const errorResponseSchema = z.object({
	message: z.string().meta({ description: "Error message" }),
})

function makeGetUserActivitySwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["users"],
		summary: "Get user activity history",
		description: "Retrieve the last 20 activity events for a specific user.",
		security: true,
		params: getUserActivityRequestSchema,
		responses: {
			200: {
				description: "User activity retrieved successfully",
				schema: getUserActivityResponseSchema,
			},
			401: { description: "Unauthorized" },
			403: { description: "Forbidden", schema: errorResponseSchema },
			404: { description: "User not found", schema: errorResponseSchema },
		},
	})
}
```

Em `apps/backend/src/shared/infra/ioc/module/service-identifier/user-types.ts`, adicionar dentro de `UseCases` e `Controllers`:

```typescript
	UseCases: {
		// ...
		GetUserActivity: Symbol.for("GetUserActivityUseCase"),
	},
	Controllers: {
		// ...
		GetUserActivity: Symbol.for("GetUserActivityController"),
	},
```

Em `apps/backend/src/shared/infra/ioc/module/user/user-module.ts`, adicionar os imports e os binds:

```typescript
import { GetUserActivityUseCase } from "@/user/application/use-case/get-user-activity.usecase"
import { GetUserActivityController } from "@/user/infra/controller/get-user-activity.controller"
```

```typescript
	bind(USER_TYPES.UseCases.GetUserActivity).to(GetUserActivityUseCase)
	bind(USER_TYPES.Controllers.GetUserActivity).to(GetUserActivityController)
```

Em `apps/backend/src/bootstrap/setup-user-module.ts`, adicionar ao array `controllers`:

```typescript
		resolve(USER_TYPES.Controllers.GetUserActivity),
```

- **Step 4: Rodar o teste e confirmar o sucesso**

Run: `npx vitest run --config ./test/vite.config.business-flow.ts src/user/infra/controller/get-user-activity.business-flow-test.ts` (a partir de `apps/backend/`)
Expected: PASS — os 3 testes (200 com lista, 403 não-admin, 404 usuário inexistente).

- **Step 5: Commit**

```bash
git add apps/backend/src/user/infra/controller/get-user-activity.controller.ts apps/backend/src/user/infra/controller/get-user-activity.business-flow-test.ts apps/backend/src/user/infra/controller/routes/user-routes.ts apps/backend/src/shared/infra/ioc/module/service-identifier/user-types.ts apps/backend/src/shared/infra/ioc/module/user/user-module.ts apps/backend/src/bootstrap/setup-user-module.ts
git commit -m "feat: expõe GET /users/:userId/activity para o histórico de atividade"
```

## Critérios de Sucesso

- `GET /users/:userId/activity` autenticado como admin retorna 200 com `{ events: [...] }` no formato de `GetUserActivityUseCaseOutputDTO` (FR-001).
- Rota registrada com `isProtected: true, onlyAdmin: true` (padrão declarativo do `JwtRouteGuard`, igual a `get-user-stats.controller.ts` e ~15 outros controllers do módulo) — sem checagem manual de `req.user.sub.role` no `callback()`.
- Solicitante autenticado que não é admin recebe 403 (via `onlyAdmin`, não via checagem manual).
- Usuário alvo inexistente recebe 404 (via `UserNotFoundError` mapeado por `createResponseError`).
- Requisição sem token recebe 401 (comportamento herdado de `isProtected: true`, já coberto pelo padrão dos demais controllers).
- `type` na resposta é uma união literal de 8 valores (`z.enum`), não `string` solto — o client OpenAPI gerado propaga o tipo literal para o frontend (tasks 16-18).
- O teste "200 com a lista de eventos" rebinda `USER_TYPES.DAO.UserActivity` **antes** de `serverBuildForTest()` resolver a cadeia controller→use case→DAO — o rebind tardio (depois do boot) não alcançaria a instância já instanciada pelo Inversify.
