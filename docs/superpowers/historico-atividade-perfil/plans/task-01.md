# Task 1: Endpoint `GET /users/me/activity` no backend [FR-002, FR-003]

**Status:** DONE
**PRD:** `../prd/prd-historico-atividade-perfil.md`
**Spec:** `../specs/historico-atividade-perfil-design.md`
**Tier:** standard
**Depends on:** N/A

## Visão Geral

Cria o endpoint `GET /users/me/activity` (visão do próprio usuário autenticado), mirror declarativo do endpoint admin `GET /users/:userId/activity`. O novo controller `GetMyActivityController` resolve `userId` exclusivamente de `req.user.sub.id` (nunca de input do cliente), registra a rota com `isProtected: true` (sem `onlyAdmin`), e delega ao `GetUserActivityUseCase` já existente — que retorna os últimos 20 itens mesclados (`UserActivityEvent` + `CheckIn`) ordenados por data decrescente, sem paginação (FR-003). Nenhum arquivo de application/domain/DAO é alterado; apenas controller + rota + IoC + bootstrap. Ao final, regenera a spec OpenAPI e os tipos do `@repo/api-types` via `pnpm generate:types` para que o frontend (Task 3) possa referenciar `paths["/users/me/activity"]`.

## Arquivos

- Create: `apps/backend/src/user/infra/controller/get-my-activity.controller.ts`
- Modify: `apps/backend/src/user/infra/controller/routes/user-routes.ts` (constante `MY_ACTIVITY`)
- Modify: `apps/backend/src/shared/infra/ioc/module/service-identifier/user-types.ts` (símbolo do controller)
- Modify: `apps/backend/src/shared/infra/ioc/module/user/user-module.ts` (bind)
- Modify: `apps/backend/src/bootstrap/setup-user-module.ts` (resolve no array de controllers)
- Test: `apps/backend/src/user/infra/controller/get-my-activity.business-flow-test.ts`

### Conformidade com as Skills Padrão

- `zod`: validação/schemas — o controller usa `z` para o schema de resposta Swagger (mesmo padrão do controller admin).
- `test-antipatterns`: os testes business-flow simulam o DAO e o repositório — evita testar mock em vez do contrato.
- `context7`: verificação das APIs de pacotes dependentes (Inversify, Fastify, openapi-typescript) antes de escrever a integração.
- `typescript-advanced`: tipagem do `Either` de retorno do use case e do schema Swagger tipado.

### Fidelidade Visual

<!-- N/A — task de backend, sem dimensão visual. Subseção omitida. -->

## Passos

- **Step 1: Escrever o teste business-flow que falha**

Crie `apps/backend/src/user/infra/controller/get-my-activity.business-flow-test.ts`:

```typescript
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

describe("Buscar Meu Histórico de Atividade", () => {
	let fastifyServer: FastifyAdapter | undefined
	let userRepository: InMemoryUserRepository
	let authenticate: AuthenticateUseCase
	let memberToken: string

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

	async function bootServerAndAuthenticateMember(): Promise<FastifyAdapter> {
		const server = await serverBuildForTest()
		fastifyServer = server
		await server.ready()
		authenticate = container.get<AuthenticateUseCase>(
			AUTH_TYPES.UseCases.Authenticate,
		)
		await createAndSaveUser({
			userRepository,
			id: "member-id",
			email: "member@activity.test",
			password: "any_password",
			role: "MEMBER",
		})
		const result = await authenticate.execute({
			email: "member@activity.test",
			password: "any_password",
		})
		memberToken = result.force.success().value.token
		return server
	}

	test("deve retornar 200 com o histórico do usuário autenticado", async () => {
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
		const server = await bootServerAndAuthenticateMember()

		const response = await request(server.server)
			.get("/users/me/activity")
			.set("Authorization", `Bearer ${memberToken}`)

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

	test("deve retornar 401 sem token", async () => {
		container.rebind(USER_TYPES.DAO.UserActivity).toConstantValue(
			new InMemoryUserActivityDao([]),
		)
		const server = await bootServerAndAuthenticateMember()

		const response = await request(server.server).get("/users/me/activity")

		expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
	})
})
```

- **Step 2: Rodar o teste para confirmar que falha**

Run: `npx vitest run --config ./test/vite.config.business-flow.ts src/user/infra/controller/get-my-activity.business-flow-test.ts` (a partir de `apps/backend`)
Expected: FAIL — a rota `/users/me/activity` não está registrada (404) e/ou o controller ainda não existe.

- **Step 3: Adicionar a constante de rota**

Em `apps/backend/src/user/infra/controller/routes/user-routes.ts`, adicione a linha `MY_ACTIVITY` dentro do objeto `UserRoutes` (após `METRICS`):

```typescript
	METRICS: `${PREFIX}/me/metrics`,
	MY_ACTIVITY: `${PREFIX}/me/activity`,
```

- **Step 4: Adicionar o símbolo IoC**

Em `apps/backend/src/shared/infra/ioc/module/service-identifier/user-types.ts`, dentro de `Controllers`, adicione:

```typescript
		GetUserActivity: Symbol.for("GetUserActivityController"),
		GetMyActivity: Symbol.for("GetMyActivityController"),
```

- **Step 5: Criar o controller**

Crie `apps/backend/src/user/infra/controller/get-my-activity.controller.ts`:

```typescript
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

export class GetMyActivityController extends BaseController {
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

	@Logger({
		message: "✅ | 🔒",
	})
	async init() {
		this.server.register(
			"get",
			UserRoutes.MY_ACTIVITY,
			{
				callback: this.callback,
				isProtected: true,
			},
			makeGetMyActivitySwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest) {
		const {
			sub: { id },
		} = req.user
		const result = await this.getUserActivity.execute({ userId: id })
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

const getMyActivityResponseSchema = z.object({
	events: z.array(activityEventResponseSchema),
})

const errorResponseSchema = z.object({
	message: z.string().meta({ description: "Error message" }),
})

function makeGetMyActivitySwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["users"],
		summary: "Get my activity history",
		description: "Retrieve the last 20 activity events for the authenticated user.",
		security: true,
		responses: {
			200: {
				description: "User activity retrieved successfully",
				schema: getMyActivityResponseSchema,
			},
			401: { description: "Unauthorized" },
			404: { description: "User not found", schema: errorResponseSchema },
		},
	})
}
```

- **Step 6: Registrar o bind no módulo**

Em `apps/backend/src/shared/infra/ioc/module/user/user-module.ts`:

1. Adicione o import (em ordem alfabética com os demais imports de controller):

```typescript
import { GetMyActivityController } from "@/user/infra/controller/get-my-activity.controller"
```

2. Adicione o bind logo após `bind(USER_TYPES.Controllers.GetUserActivity).to(GetUserActivityController)`:

```typescript
	bind(USER_TYPES.Controllers.GetMyActivity).to(GetMyActivityController)
```

- **Step 7: Resolver no bootstrap**

Em `apps/backend/src/bootstrap/setup-user-module.ts`, dentro do array `controllers`, logo após `resolve(USER_TYPES.Controllers.GetUserActivity),`:

```typescript
		resolve(USER_TYPES.Controllers.GetMyActivity),
```

- **Step 8: Rodar o teste para confirmar que passa**

Run: `npx vitest run --config ./test/vite.config.business-flow.ts src/user/infra/controller/get-my-activity.business-flow-test.ts` (a partir de `apps/backend`)
Expected: PASS — ambos os testes ("200 com histórico" e "401 sem token") passam.

- **Step 9: Regenerar OpenAPI spec e tipos compartilhados**

Run: `pnpm generate:types`
Expected: o comando exporta `docs/openapi-spec.json` (incluindo a rota `GET /users/me/activity`) e regenera `apps/backend/src/shared/infra/openapi/generated/api-types.d.ts` + o `@repo/api-types` — habilitando `paths["/users/me/activity"]` no frontend.

- **Step 10: Commit** *(execução sequencial apenas — em wave paralela o orquestrador faz o commit na barreira de integração. Se você for um implementador em árvore compartilhada, pule este passo e reporte os arquivos.)*

```bash
git add apps/backend/src/user/infra/controller/get-my-activity.controller.ts apps/backend/src/user/infra/controller/get-my-activity.business-flow-test.ts apps/backend/src/user/infra/controller/routes/user-routes.ts apps/backend/src/shared/infra/ioc/module/service-identifier/user-types.ts apps/backend/src/shared/infra/ioc/module/user/user-module.ts apps/backend/src/bootstrap/setup-user-module.ts
git commit -m "feat(user): expose GET /users/me/activity for the authenticated user"
```

## Critérios de Sucesso

- `GET /users/me/activity` com token válido de um usuário MEMBER retorna `200` com `{ events: UserActivityListItem[] }` (últimos 20, ordenados por data desc) — o teste de 200 passa.
- `GET /users/me/activity` sem token retorna `401` — o teste de 401 passa.
- O `userId` é derivado 100% de `req.user.sub.id`; nenhum caminho aceita `userId` do cliente (FR-002).
- O write path (`RecordUserActivitySubscriber`, `UserActivityRepository`, eventos de domínio) e o endpoint admin `GET /users/:userId/activity` permanecem intocados.
- `pnpm generate:types` regenera a spec e os tipos; `paths["/users/me/activity"]` existe em `@repo/api-types` (FR-003).