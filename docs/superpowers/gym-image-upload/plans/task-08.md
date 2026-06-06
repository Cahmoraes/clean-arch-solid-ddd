# Task 8: `UpdateGymController` + rota `PUT /gyms/:gymId` + wiring + business-flow [FR-006, FR-009, FR-015]

**Status:** PENDING
**PRD:** `../prd/prd-gym-image-upload.md`
**Spec:** `../specs/gym-image-upload-design.md`
**Depends on:** task-04

## Visão Geral

Expõe a atualização de dados cadastrais via `PUT /gyms/:gymId` (admin-only — FR-015), conectando o `UpdateGymUseCase` ao HTTP (FR-006, FR-009). Inclui o registro IoC (símbolo, binding e bootstrap) do use case e do controller, e um teste business-flow cobrindo sucesso, 404 e 403.

> **Edição compartilhada:** esta task altera `gym-routes.ts`, `gym-types.ts`, `gym-module.ts` e `setup-gym-module.ts`. A task-09 também os altera e depende desta para serializar as edições.

## Arquivos

- Create: `apps/backend/src/gym/infra/controller/update-gym.controller.ts`
- Modify: `apps/backend/src/gym/infra/controller/routes/gym-routes.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/service-identifier/gym-types.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/gym/gym-module.ts`
- Modify: `apps/backend/src/bootstrap/setup-gym-module.ts`
- Test: `apps/backend/src/gym/infra/controller/update-gym.business-flow-test.ts`

### Conformidade com as Skills Padrão

- use no-workarounds: controller só faz parsing/resposta; lógica no use case.
- use test-antipatterns: business-flow valida o fluxo HTTP real (sucesso, not-found, acesso negado).

## Passos

- **Step 1: Adicionar a rota `UPDATE`**

Em `apps/backend/src/gym/infra/controller/routes/gym-routes.ts`:

```typescript
export const GymRoutes = {
	CREATE: "/gyms",
	LIST: "/gyms",
	GET: "/gyms/:gymId",
	UPDATE: "/gyms/:gymId",
	SEARCH: "/gyms/search/:name",
} as const
```

- **Step 2: Adicionar o símbolo do controller**

Em `apps/backend/src/shared/infra/ioc/module/service-identifier/gym-types.ts`, no bloco `Controllers`, adicione `UpdateGym`:

```typescript
	Controllers: {
		CreateGym: Symbol.for("CreateGymController"),
		UpdateGym: Symbol.for("UpdateGymController"),
		SearchGym: Symbol.for("SearchGymController"),
		FetchNearbyGym: Symbol.for("FetchNearbyGymController"),
		FetchAllGyms: Symbol.for("FetchAllGymsController"),
		FetchGymById: Symbol.for("FetchGymByIdController"),
	},
```

- **Step 3: Escrever o teste business-flow que falha**

Crie `apps/backend/src/gym/infra/controller/update-gym.business-flow-test.ts`:

```typescript
import request from "supertest"
import { createAndSaveGym } from "test/factory/create-and-save-gym"
import { createAndSaveUser } from "test/factory/create-and-save-user"

import { serverBuild } from "@/bootstrap/server-build"
import type { AuthenticateUseCase } from "@/session/application/use-case/authenticate.usecase"
import { InMemoryGymRepository } from "@/shared/infra/database/repository/in-memory/in-memory-gym-repository"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { AUTH_TYPES, GYM_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"
import { RoleValues } from "@/user/domain/value-object/role"

import { GymRoutes } from "./routes/gym-routes"

describe("Atualizar Academia (PUT /gyms/:gymId)", () => {
	let fastifyServer: FastifyAdapter
	let userRepository: InMemoryUserRepository
	let gymRepository: InMemoryGymRepository
	let authenticate: AuthenticateUseCase

	beforeEach(async () => {
		container.snapshot()
		gymRepository = new InMemoryGymRepository()
		userRepository = new InMemoryUserRepository()
		await container.unbind(USER_TYPES.Repositories.User)
		container.bind(USER_TYPES.Repositories.User).toConstantValue(userRepository)
		await container.unbind(GYM_TYPES.Repositories.Gym)
		container.bind(GYM_TYPES.Repositories.Gym).toConstantValue(gymRepository)
		authenticate = container.get<AuthenticateUseCase>(
			AUTH_TYPES.UseCases.Authenticate,
		)
		fastifyServer = await serverBuild()
		await fastifyServer.ready()
	})

	afterEach(async () => {
		container.restore()
		await fastifyServer.close()
	})

	async function adminToken(): Promise<string> {
		await createAndSaveUser({
			userRepository,
			email: "admin@email.com",
			password: "password",
			role: RoleValues.ADMIN,
		})
		const auth = await authenticate.execute({
			email: "admin@email.com",
			password: "password",
		})
		return auth.forceSuccess().value.token
	}

	test("admin atualiza os dados de uma academia", async () => {
		const token = await adminToken()
		await createAndSaveGym({ gymRepository, id: "gym-1", title: "Nome Antigo" })

		const response = await request(fastifyServer.server)
			.put(GymRoutes.UPDATE.replace(":gymId", "gym-1"))
			.auth(token, { type: "bearer" })
			.send({
				cnpj: "11.222.333/0001-81",
				title: "Nome Novo",
				latitude: -23.5,
				longitude: -46.6,
				address: "Rua B, 2",
			})

		expect(response.status).toBe(200)
		expect(response.body.message).toBe("Gym updated")
		const found = await gymRepository.gymOfId("gym-1")
		expect(found?.title).toBe("Nome Novo")
	})

	test("retorna 404 quando a academia não existe", async () => {
		const token = await adminToken()
		const response = await request(fastifyServer.server)
			.put(GymRoutes.UPDATE.replace(":gymId", "inexistente"))
			.auth(token, { type: "bearer" })
			.send({
				cnpj: "11.222.333/0001-81",
				title: "Qualquer",
				latitude: 0,
				longitude: 0,
				address: "Rua A, 1",
			})
		expect(response.status).toBe(404)
	})

	test("retorna 403 para usuário não-admin", async () => {
		await createAndSaveUser({
			userRepository,
			email: "member@email.com",
			password: "password",
			role: RoleValues.MEMBER,
		})
		const auth = await authenticate.execute({
			email: "member@email.com",
			password: "password",
		})
		const token = auth.forceSuccess().value.token
		await createAndSaveGym({ gymRepository, id: "gym-1" })

		const response = await request(fastifyServer.server)
			.put(GymRoutes.UPDATE.replace(":gymId", "gym-1"))
			.auth(token, { type: "bearer" })
			.send({
				cnpj: "11.222.333/0001-81",
				title: "Nome",
				latitude: 0,
				longitude: 0,
				address: "Rua A, 1",
			})
		expect(response.status).toBe(403)
	})
})
```

- **Step 4: Rodar o teste e confirmar a falha**

Run: `pnpm --filter backend test:business-flow -- -t "Atualizar Academia"`
Expected: FAIL — controller/rota inexistentes.

- **Step 5: Implementar o `UpdateGymController`**

Crie `apps/backend/src/gym/infra/controller/update-gym.controller.ts`:

```typescript
import type { FastifyRequest } from "fastify"
import { inject } from "inversify"
import { z } from "zod"
import type { UpdateGymUseCase } from "@/gym/application/use-case/update-gym.usecase"
import { BaseController } from "@/shared/infra/controller/base-controller"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory"
import { Logger } from "@/shared/infra/decorator/logger"
import { GYM_TYPES, SHARED_TYPES } from "@/shared/infra/ioc/types"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type { HttpServer, Schema } from "@/shared/infra/server/http-server"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"
import { GymRoutes } from "./routes/gym-routes"

const updateGymParamsSchema = z.object({
	gymId: z.string().min(1).meta({
		description: "Gym ID",
		example: "550e8400-e29b-41d4-a716-446655440000",
	}),
})

const updateGymBodySchema = z.object({
	cnpj: z.string().meta({ description: "Gym CNPJ", example: "12345678000100" }),
	title: z.string().meta({ description: "Gym name", example: "Iron Gym" }),
	description: z
		.string()
		.optional()
		.meta({ description: "Gym description", example: "A great gym" }),
	phone: z
		.string()
		.optional()
		.meta({ description: "Gym phone number", example: "11999999999" }),
	latitude: z.number().meta({ description: "Gym latitude", example: -23.5505 }),
	longitude: z
		.number()
		.meta({ description: "Gym longitude", example: -46.6333 }),
	address: z.string().meta({
		description: "Full gym address",
		example: "Rua das Flores, 123, São Paulo - SP",
	}),
})

export type UpdateGymPayload = z.infer<typeof updateGymBodySchema>

export class UpdateGymController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly server: HttpServer,
		@inject(GYM_TYPES.UseCases.UpdateGym)
		private readonly updateGymUseCase: UpdateGymUseCase,
	) {
		super()
		this.bindMethods()
	}

	private bindMethods() {
		this.callback = this.callback.bind(this)
	}

	@Logger({ message: "✅" })
	public async init(): Promise<void> {
		this.server.register(
			"put",
			GymRoutes.UPDATE,
			{ callback: this.callback, isProtected: true, onlyAdmin: true },
			makeUpdateGymSwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest) {
		const parsedParamsOrError = this.parseRequest(
			updateGymParamsSchema,
			req.params,
		)
		if (parsedParamsOrError.isFailure()) {
			return this.createResponseError(parsedParamsOrError)
		}
		const parsedBodyOrError = this.parseRequest(updateGymBodySchema, req.body)
		if (parsedBodyOrError.isFailure()) {
			return this.createResponseError(parsedBodyOrError)
		}

		const result = await this.updateGymUseCase.execute({
			gymId: parsedParamsOrError.value.gymId,
			...parsedBodyOrError.value,
		})
		if (result.isFailure()) {
			return this.createResponseError(result)
		}

		return ResponseFactory.create({
			status: HTTP_STATUS.OK,
			body: { message: "Gym updated", id: result.value.gymId },
		})
	}
}

function makeUpdateGymSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["gyms"],
		summary: "Update a gym",
		description: "Update an existing gym's registration data. Requires ADMIN role",
		security: true,
		params: updateGymParamsSchema,
		body: updateGymBodySchema,
		responses: {
			200: {
				description: "Gym updated successfully",
				schema: z.object({
					message: z.string().meta({ example: "Gym updated" }),
					id: z.string().meta({ description: "Updated gym ID" }),
				}),
			},
			400: {
				description: "Invalid request",
				schema: z.object({ message: z.string() }),
			},
			404: {
				description: "Gym not found",
				schema: z.object({ message: z.string() }),
			},
			409: {
				description: "Conflict - CNPJ already used by another gym",
				schema: z.object({ message: z.string() }),
			},
		},
	})
}
```

- **Step 6: Registrar o use case e o controller no IoC**

Em `apps/backend/src/shared/infra/ioc/module/gym/gym-module.ts`:

1. Adicione os imports:

```typescript
import { UpdateGymUseCase } from "@/gym/application/use-case/update-gym.usecase"
import { UpdateGymController } from "@/gym/infra/controller/update-gym.controller"
```

2. Dentro do `ContainerModule`, adicione os bindings:

```typescript
	bind(GYM_TYPES.Controllers.UpdateGym).to(UpdateGymController)
	bind(GYM_TYPES.UseCases.UpdateGym).to(UpdateGymUseCase)
```

- **Step 7: Adicionar o controller ao bootstrap**

Em `apps/backend/src/bootstrap/setup-gym-module.ts`, adicione ao array `controllers`:

```typescript
	const controllers = [
		resolve(GYM_TYPES.Controllers.CreateGym),
		resolve(GYM_TYPES.Controllers.UpdateGym),
		resolve(GYM_TYPES.Controllers.SearchGym),
		resolve(GYM_TYPES.Controllers.FetchAllGyms),
		resolve(GYM_TYPES.Controllers.FetchGymById),
	]
```

- **Step 8: Rodar o teste e confirmar o sucesso**

Run: `pnpm --filter backend test:business-flow -- -t "Atualizar Academia"`
Expected: PASS (3 testes).

- **Step 9: Tipos + lint + commit**

Run: `pnpm --filter backend tsc:check`
Expected: zero erros.

Run: `pnpm --filter backend biome:fix`
Expected: zero problemas.

```bash
git add apps/backend/src/gym apps/backend/src/shared/infra/ioc/module/gym/gym-module.ts apps/backend/src/shared/infra/ioc/module/service-identifier/gym-types.ts apps/backend/src/bootstrap/setup-gym-module.ts
git commit -m "feat(gym): add PUT /gyms/:gymId UpdateGymController with IoC wiring"
```

## Critérios de Sucesso

- `PUT /gyms/:gymId` atualiza dados (200), retorna 404 (inexistente) e 403 (não-admin). [FR-006, FR-009, FR-015]
- Use case e controller registrados no container e no bootstrap.
- Business-flow, `tsc:check` e `biome:fix` sem problemas.
