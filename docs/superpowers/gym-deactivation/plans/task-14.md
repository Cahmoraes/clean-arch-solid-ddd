# Task 14: `SearchGymController` — `isProtected: true` + papel repassado [FR-006, FR-012]

**Status:** PENDING
**PRD:** `../prd/prd-gym-deactivation.md`
**Spec:** `../specs/gym-deactivation-design.md`
**Tier:** cheap
**Depends on:** task-08

## Visão Geral

Mesmo tratamento da Task 13, aplicado a `SearchGymController` (busca de academias por nome).
A rota passa a exigir autenticação (`isProtected: true`, sem `onlyAdmin`), alinhando o
runtime ao `security: true` já declarado em seu Swagger. O controller calcula
`isAdmin = req.user?.sub.role === "ADMIN"` e repassa `includeInactive: isAdmin` para
`SearchGymUseCase.execute()` (Task 8). O schema de resposta `gymSearchItemSchema` ganha
`status`.

**Nota de compatibilidade:** com `isProtected: true`, uma busca sem token Bearer válido agora
recebe 401 em vez de 200/404.

## Arquivos

- Modify: `apps/backend/src/gym/infra/controller/search-gym.controller.ts`
- Test: `apps/backend/src/gym/infra/controller/search-gym.controller.test.ts`

### Conformidade com as Skills Padrão

- `typescript-advanced`: leitura tipada de `req.user?.sub.role`, extensão do schema `zod` de
  resposta com `status`.
- `vitest`: suíte de teste HTTP via `supertest` + `serverBuildForTest()`, seguindo a mesma
  convenção usada na Task 13.
- `no-workarounds`: `includeInactive` é derivado exclusivamente do papel do usuário
  autenticado, nunca de um parâmetro de query controlável pelo cliente.

## Passos

- **Step 1: Escrever o teste que falha**

```typescript
import request from "supertest"
import { createAndSaveGym } from "test/factory/create-and-save-gym"
import { createAndSaveUser } from "test/factory/create-and-save-user"
import { serverBuildForTest } from "test/factory/server-build-for-test"
import type { AuthenticateUseCase } from "@/session/application/use-case/authenticate.usecase"
import { InMemoryGymRepository } from "@/shared/infra/database/repository/in-memory/in-memory-gym-repository"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { AUTH_TYPES, GYM_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"
import { GymRoutes } from "./routes/gym-routes"
import { RoleValues } from "@/user/domain/value-object/role"

describe("SearchGymController — includeInactive por papel", () => {
	let fastifyServer: FastifyAdapter
	let userRepository: InMemoryUserRepository
	let gymRepository: InMemoryGymRepository
	let authenticate: AuthenticateUseCase

	beforeEach(async () => {
		container.snapshot()
		userRepository = new InMemoryUserRepository()
		gymRepository = new InMemoryGymRepository()
		container.rebind(USER_TYPES.Repositories.User).toConstantValue(userRepository)
		container.rebind(GYM_TYPES.Repositories.Gym).toConstantValue(gymRepository)
		authenticate = container.get<AuthenticateUseCase>(AUTH_TYPES.UseCases.Authenticate)
		fastifyServer = await serverBuildForTest()
		await fastifyServer.ready()
	})

	afterEach(async () => {
		container.restore()
		await fastifyServer.close()
	})

	async function getTokenForRole(role: (typeof RoleValues)[keyof typeof RoleValues]): Promise<string> {
		const email = `${role.toLowerCase()}@test.com`
		await createAndSaveUser({ userRepository, email, password: "any_password", role })
		const result = await authenticate.execute({ email, password: "any_password" })
		return result.force.success().value.token
	}

	test("sem token, retorna 401", async () => {
		const response = await request(fastifyServer.server).get(
			GymRoutes.SEARCH.replace(":name", "Alpha"),
		)

		expect(response.status).toBe(401)
	})

	test("admin autenticado encontra academia desativada na busca, com status 'deactivated'", async () => {
		const token = await getTokenForRole(RoleValues.ADMIN)
		const gym = await createAndSaveGym({ gymRepository, title: "Academia Alpha" })
		gym.deactivate()
		await gymRepository.update(gym)

		const response = await request(fastifyServer.server)
			.get(GymRoutes.SEARCH.replace(":name", "Alpha"))
			.set("Authorization", `Bearer ${token}`)

		expect(response.status).toBe(200)
		const found = response.body.gyms.find((g: { id: string }) => g.id === gym.id)
		expect(found?.status).toBe("deactivated")
	})

	test("usuário comum autenticado não encontra academia desativada na busca", async () => {
		const token = await getTokenForRole(RoleValues.MEMBER)
		const gym = await createAndSaveGym({ gymRepository, title: "Academia Alpha" })
		gym.deactivate()
		await gymRepository.update(gym)

		const response = await request(fastifyServer.server)
			.get(GymRoutes.SEARCH.replace(":name", "Alpha"))
			.set("Authorization", `Bearer ${token}`)

		expect(response.status).toBe(404)
	})
})
```

- **Step 2: Rodar o teste e confirmar que falha**

Run: `pnpm --filter backend test:run -- -t "SearchGymController"`
Expected: FAIL — a busca sem token retorna 200/404 (rota ainda não é `isProtected`), e o
`status` não existe no item de resposta.

- **Step 3: Implementação mínima**

Trecho atual do `init` e do `callback`:
```typescript
	@Logger({
		message: "✅",
	})
	public async init() {
		this.server.register(
			"get",
			GymRoutes.SEARCH,
			{
				callback: this.callback,
			},
			makeSearchGymSwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest) {
		const parsedParamsOrError = this.parseRequest(
			searchGymRequestSchema,
			req.params,
		)
		if (parsedParamsOrError.isFailure()) {
			return this.createResponseError(parsedParamsOrError)
		}

		const parsedQueryOrError = this.parseRequest(
			searchGymParamsSchema,
			req.query,
		)
		if (parsedQueryOrError.isFailure()) {
			return this.createResponseError(parsedQueryOrError)
		}

		const result = await this.searchGymUseCase.execute({
			name: parsedParamsOrError.value.name,
			page: parsedQueryOrError.value.page,
		})
		if (this.isGymNotFound(result)) {
			return ResponseFactory.create({
				status: HTTP_STATUS.NOT_FOUND,
				message: "Gym not found",
			})
		}

		return ResponseFactory.create({
			status: HTTP_STATUS.OK,
			body: { gyms: result.data, pagination: result.pagination },
		})
	}
```

Trecho após a mudança:
```typescript
	@Logger({
		message: "✅",
	})
	public async init() {
		this.server.register(
			"get",
			GymRoutes.SEARCH,
			{
				callback: this.callback,
				isProtected: true,
			},
			makeSearchGymSwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest) {
		const parsedParamsOrError = this.parseRequest(
			searchGymRequestSchema,
			req.params,
		)
		if (parsedParamsOrError.isFailure()) {
			return this.createResponseError(parsedParamsOrError)
		}

		const parsedQueryOrError = this.parseRequest(
			searchGymParamsSchema,
			req.query,
		)
		if (parsedQueryOrError.isFailure()) {
			return this.createResponseError(parsedQueryOrError)
		}

		const isAdmin = req.user?.sub.role === "ADMIN"
		const result = await this.searchGymUseCase.execute({
			name: parsedParamsOrError.value.name,
			page: parsedQueryOrError.value.page,
			includeInactive: isAdmin,
		})
		if (this.isGymNotFound(result)) {
			return ResponseFactory.create({
				status: HTTP_STATUS.NOT_FOUND,
				message: "Gym not found",
			})
		}

		return ResponseFactory.create({
			status: HTTP_STATUS.OK,
			body: { gyms: result.data, pagination: result.pagination },
		})
	}
```

`gymSearchItemSchema` atual:
```typescript
const gymSearchItemSchema = z.object({
	id: z.string().meta({
		description: "Gym ID",
		example: "550e8400-e29b-41d4-a716-446655440000",
	}),
	title: z.string().meta({ description: "Gym name", example: "Iron Gym" }),
	description: z.string().nullable().meta({ description: "Gym description" }),
	phone: z.string().nullable().meta({ description: "Gym phone number" }),
	imageKey: z
		.string()
		.nullable()
		.meta({ description: "Relative key of the gym image" }),
	latitude: z.number().meta({ description: "Latitude", example: -23.5505 }),
	longitude: z.number().meta({ description: "Longitude", example: -46.6333 }),
})
```

`gymSearchItemSchema` após a mudança (adiciona `status`):
```typescript
const gymSearchItemSchema = z.object({
	id: z.string().meta({
		description: "Gym ID",
		example: "550e8400-e29b-41d4-a716-446655440000",
	}),
	title: z.string().meta({ description: "Gym name", example: "Iron Gym" }),
	description: z.string().nullable().meta({ description: "Gym description" }),
	phone: z.string().nullable().meta({ description: "Gym phone number" }),
	imageKey: z
		.string()
		.nullable()
		.meta({ description: "Relative key of the gym image" }),
	latitude: z.number().meta({ description: "Latitude", example: -23.5505 }),
	longitude: z.number().meta({ description: "Longitude", example: -46.6333 }),
	status: z
		.enum(["activated", "deactivated"])
		.meta({ description: "Gym status", example: "activated" }),
})
```

`SearchGymUseCase.execute()` já aceita `includeInactive?: boolean` desde a Task 8, e o DTO
retornado já inclui `status` — nenhuma outra mudança é necessária no use case.

- **Step 4: Rodar o teste e confirmar que passa**

Run: `pnpm --filter backend test:run -- -t "SearchGymController"`
Expected: PASS — os 3 casos de teste passam.

- **Step 5: Commit**

```bash
git add apps/backend/src/gym/infra/controller/search-gym.controller.ts \
  apps/backend/src/gym/infra/controller/search-gym.controller.test.ts
git commit -m "feat(gym): require auth and filter deactivated gyms by role on gym search"
```

## Critérios de Sucesso

- `GET /gyms/search/:name` exige autenticação (`isProtected: true`) — uma busca sem token
  retorna 401.
- Um admin autenticado encontra academias desativadas na busca, cada uma com
  `status: "deactivated"` (FR-009).
- Um usuário comum autenticado não encontra academias desativadas na busca — o resultado
  vazio ainda produz 404, comportamento já existente do controller (FR-006).
- `gymSearchItemSchema` inclui `status: "activated" | "deactivated"` para todo item retornado
  (FR-012).
- `pnpm --filter backend test:run -- -t "SearchGymController"` passa com os 3 casos mínimos.
