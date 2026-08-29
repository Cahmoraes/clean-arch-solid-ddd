# Task 1: Backend: endpoint admin aceita `page` e retorna `pagination`

**Status:** PENDING
**PRD:** N/A
**Spec:** `../specs/paginacao-atividade-admin-usuarios-design.md`
**Tier:** standard
**Depends on:** N/A

## Visão Geral

`GET /users/:userId/activity` (admin-only) hoje hardcoda `page: 1` na chamada ao use case e descarta o campo `pagination` que o use case já calcula. Esta task espelha o padrão já usado em `GET /users/me/activity`: aceita `page` via query string e inclui `pagination` na resposta. Nenhuma mudança no use case, no guard `onlyAdmin` ou nas regras de negócio.

## Arquivos

- Modify: `apps/backend/src/user/infra/controller/get-user-activity.controller.ts`
- Modify: `apps/backend/src/user/infra/controller/get-user-activity.business-flow-test.ts`
- Modify: `packages/api-types/index.d.ts` (via `pnpm generate:types`, não editar manualmente)

### Conformidade com as Skills Padrão

- `zod`: novo schema de query (`page`), espelhando `getMyActivityQuerySchema` — validação com `z.coerce.number().int().min(1)`
- `typescript-advanced`: o schema de resposta ganha o campo `pagination` (mesmo shape do `getMyActivityResponseSchema`), mantendo inferência de tipos via `z.infer`
- `test-antipatterns`: atualizar o teste que hoje afirma `pagination` ausente sem introduzir mocks que escondam o comportamento real do use case (segue usando `InMemoryUserActivityDao`, já em uso no arquivo)
- `no-workarounds`: a correção é no controller que descarta um dado já calculado pelo use case — não introduzir um novo campo paralelo nem duplicar o cálculo de paginação

## Passos

- **Step 1: Atualizar o teste que assume `pagination` ausente e adicionar os novos casos**

```typescript
// apps/backend/src/user/infra/controller/get-user-activity.business-flow-test.ts
// Substituir o teste "deve retornar 200 com a lista de eventos de atividade"
// e adicionar dois novos testes, mantendo os demais (403, 404) inalterados.

	test("deve retornar 200 com paginação calculada quando nenhuma página é informada", async () => {
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
		const server = await bootServerAndAuthenticateAdmin()
		await createAndSaveUser({
			userRepository,
			id: targetId,
			email: "target@activity.test",
		})

		const response = await request(server.server)
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
		expect(response.body.pagination).toEqual({
			page: 1,
			pageSize: 20,
			total: 1,
			totalPages: 1,
		})
	})

	test("deve repassar o parâmetro page para o use case e refletir na paginação retornada", async () => {
		const targetId = randomUUID()
		container.rebind(USER_TYPES.DAO.UserActivity).toConstantValue(
			new InMemoryUserActivityDao([
				{
					id: "activity-1",
					type: "LOGIN",
					description: "Login realizado",
					occurredAt: new Date("2025-01-10T12:00:00.000Z"),
				},
			]),
		)
		const server = await bootServerAndAuthenticateAdmin()
		await createAndSaveUser({
			userRepository,
			id: targetId,
			email: "target-page2@activity.test",
		})

		const response = await request(server.server)
			.get(`/users/${targetId}/activity?page=2`)
			.set("Authorization", `Bearer ${adminToken}`)

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body.events).toEqual([])
		expect(response.body.pagination).toEqual({
			page: 2,
			pageSize: 20,
			total: 1,
			totalPages: 1,
		})
	})

	test("deve retornar 400 quando page é inválido", async () => {
		const server = await bootServerAndAuthenticateAdmin()
		const targetId = randomUUID()
		await createAndSaveUser({
			userRepository,
			id: targetId,
			email: "target-invalid-page@activity.test",
		})

		const response = await request(server.server)
			.get(`/users/${targetId}/activity?page=0`)
			.set("Authorization", `Bearer ${adminToken}`)

		expect(response.status).toBe(400)
	})
```

Remover o teste antigo "deve retornar 200 com a lista de eventos de atividade" (linhas que contêm `expect(response.body.pagination).toBeUndefined()`) — ele é substituído pelo primeiro teste acima, que verifica o novo comportamento correto.

- **Step 2: Rodar os testes para verificar que falham**

Run (dentro de `apps/backend`): `npx vitest run --config ./test/vite.config.business-flow.ts src/user/infra/controller/get-user-activity.business-flow-test.ts`
Expected: FAIL — os 3 novos/alterados testes falham porque `response.body.pagination` ainda é `undefined` (o controller não foi alterado) e `?page=0` ainda retorna 200 (sem validação de query).

- **Step 3: Implementar a mudança no controller**

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
import {
	type GetUserActivityUseCase,
	USER_ACTIVITY_PAGE_SIZE,
} from "@/user/application/use-case/get-user-activity.usecase"
import { UserRoutes } from "./routes/user-routes"

const getUserActivityRequestSchema = z.object({
	userId: z.string().meta({ description: "User ID", example: "uuid-1234" }),
})

const MAX_ACTIVITY_PAGE = Math.floor(
	Number.MAX_SAFE_INTEGER / USER_ACTIVITY_PAGE_SIZE,
)

const getUserActivityQuerySchema = z.object({
	page: z.coerce.number().int().min(1).max(MAX_ACTIVITY_PAGE).optional().meta({
		description: "Page number",
		example: 1,
		default: 1,
	}),
})

export type GetUserActivityPayload = z.infer<
	typeof getUserActivityRequestSchema
>

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

	@Logger({
		message: "✅ | 🔒",
	})
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

		const parseQueryResult = this.parseRequest(
			getUserActivityQuerySchema,
			req.query,
		)
		if (parseQueryResult.isFailure()) {
			return this.createResponseError(parseQueryResult)
		}

		const result = await this.getUserActivity.execute({
			userId: parseParamsResult.value.userId,
			page: parseQueryResult.value.page ?? 1,
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
	pagination: z.object({
		page: z.number().int().meta({ description: "Current page" }),
		pageSize: z.number().int().meta({ description: "Events per page" }),
		total: z.number().int().meta({ description: "Total events" }),
		totalPages: z.number().int().meta({ description: "Total pages" }),
	}),
})

const errorResponseSchema = z.object({
	message: z.string().meta({ description: "Error message" }),
})

function makeGetUserActivitySwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["users"],
		summary: "Get user activity history",
		description: "Retrieve a paginated activity history for a specific user.",
		security: true,
		params: getUserActivityRequestSchema,
		querystring: getUserActivityQuerySchema,
		responses: {
			200: {
				description: "User activity retrieved successfully",
				schema: getUserActivityResponseSchema,
			},
			400: {
				description: "Invalid query params",
				schema: errorResponseSchema,
			},
			401: { description: "Unauthorized" },
			403: { description: "Forbidden", schema: errorResponseSchema },
			404: { description: "User not found", schema: errorResponseSchema },
		},
	})
}
```

- **Step 4: Rodar os testes para verificar que passam**

Run (dentro de `apps/backend`): `npx vitest run --config ./test/vite.config.business-flow.ts src/user/infra/controller/get-user-activity.business-flow-test.ts`
Expected: PASS — todos os testes do arquivo (200 com paginação, page=2, page=0 → 400, 403, 404).

- **Step 5: Regenerar os tipos compartilhados**

Run (na raiz do monorepo): `pnpm generate:types`
Expected: `packages/api-types/index.d.ts` é atualizado — `paths["/users/{userId}/activity"]["get"]` passa a ter `parameters.query.page` e `responses[200].content["application/json"].pagination`, no mesmo shape de `paths["/users/me/activity"]`.

- **Step 6: Commit**

```bash
git add apps/backend/src/user/infra/controller/get-user-activity.controller.ts \
  apps/backend/src/user/infra/controller/get-user-activity.business-flow-test.ts \
  packages/api-types/index.d.ts
git commit -m "feat(activity): aceita page e retorna pagination no endpoint admin"
```

## Critérios de Sucesso

- `GET /users/:userId/activity` sem `page` retorna `pagination: { page: 1, pageSize: 20, total, totalPages }`.
- `GET /users/:userId/activity?page=2` repassa `page` ao use case e reflete no `pagination` retornado.
- `GET /users/:userId/activity?page=0` (ou qualquer valor inválido) retorna 400.
- `GET /users/:userId/activity` continua retornando 403 para não-admin e 404 para usuário inexistente (comportamento inalterado).
- `packages/api-types/index.d.ts` reflete `query.page` e `pagination` na resposta de `/users/{userId}/activity`.
