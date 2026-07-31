# Task 13: `FetchAllGymsController` — `isProtected: true` + papel repassado [FR-006, FR-012]

**Status:** PENDING
**PRD:** `../prd/prd-gym-deactivation.md`
**Spec:** `../specs/gym-deactivation-design.md`
**Tier:** cheap
**Depends on:** task-07

## Visão Geral

`FetchAllGymsController` hoje registra sua rota sem `isProtected` (nenhum hook de
autenticação roda, `req.user` nunca é populado), apesar de sua documentação Swagger já
declarar `security: true` — uma inconsistência pré-existente entre o que o OpenAPI anuncia e
o que o runtime realmente impõe. Esta task resolve essa inconsistência como parte da feature:
a rota passa a exigir autenticação (`isProtected: true`, sem `onlyAdmin` — qualquer usuário
autenticado pode listar academias), o que popula `req.user` via `JwtRouteGuard`
(`apps/backend/src/shared/infra/server/guard/jwt-route-guard.ts`). O controller então calcula
`isAdmin = req.user?.sub.role === "ADMIN"` e repassa `includeInactive: isAdmin` para
`FetchAllGymsUseCase.execute()` (Task 7) — um admin autenticado vê academias desativadas na
listagem (FR-009), um usuário comum autenticado não vê (FR-006). O schema de resposta ganha
`status` em cada item.

**Nota de compatibilidade:** com `isProtected: true`, uma requisição sem token Bearer válido
agora recebe 401 (antes recebia 200, já que a rota era efetivamente pública em runtime apesar
do Swagger dizer o contrário). Isso é uma mudança de comportamento deliberada desta feature,
alinhando o runtime com o que o Swagger já documentava.

## Arquivos

- Modify: `apps/backend/src/gym/infra/controller/fetch-all-gyms.controller.ts`
- Test: `apps/backend/src/gym/infra/controller/fetch-all-gyms.controller.test.ts`

### Conformidade com as Skills Padrão

- `typescript-advanced`: leitura tipada de `req.user?.sub.role` (populado pelo
  `RouteGuard`/`FastifyAdapter` quando `isProtected: true`), extensão do schema `zod` de
  resposta com `status`.
- `vitest`: suíte de teste HTTP via `supertest` + `serverBuildForTest()`, seguindo a mesma
  convenção usada nas Tasks 11/12.
- `no-workarounds`: o filtro `includeInactive` é derivado exclusivamente do papel do usuário
  autenticado (`req.user?.sub.role === "ADMIN"`), nunca de um parâmetro de query controlável
  pelo cliente — evita que um usuário comum force `includeInactive=true` manualmente.

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

describe("FetchAllGymsController — includeInactive por papel", () => {
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
		const response = await request(fastifyServer.server).get(GymRoutes.LIST)

		expect(response.status).toBe(401)
	})

	test("admin autenticado vê academias desativadas na listagem, com status 'deactivated'", async () => {
		const token = await getTokenForRole(RoleValues.ADMIN)
		const gym = await createAndSaveGym({ gymRepository })
		gym.deactivate()
		await gymRepository.update(gym)

		const response = await request(fastifyServer.server)
			.get(GymRoutes.LIST)
			.set("Authorization", `Bearer ${token}`)

		expect(response.status).toBe(200)
		const found = response.body.gyms.find((g: { id: string }) => g.id === gym.id)
		expect(found?.status).toBe("deactivated")
	})

	test("usuário comum autenticado não vê academias desativadas na listagem", async () => {
		const token = await getTokenForRole(RoleValues.MEMBER)
		const gym = await createAndSaveGym({ gymRepository })
		gym.deactivate()
		await gymRepository.update(gym)

		const response = await request(fastifyServer.server)
			.get(GymRoutes.LIST)
			.set("Authorization", `Bearer ${token}`)

		expect(response.status).toBe(200)
		const found = response.body.gyms.find((g: { id: string }) => g.id === gym.id)
		expect(found).toBeUndefined()
	})
})
```

- **Step 2: Rodar o teste e confirmar que falha**

Run: `pnpm --filter backend test:run -- -t "FetchAllGymsController"`
Expected: FAIL — a requisição sem token retorna 200 (rota ainda não é `isProtected`), e o
`status` não existe no item de resposta.

- **Step 3: Implementação mínima**

Trecho atual do `callback` e do `init`:
```typescript
	@Logger({ message: "✅" })
	public async init(): Promise<void> {
		this.server.register(
			"get",
			GymRoutes.LIST,
			{ callback: this.callback },
			makeFetchAllGymsSwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest) {
		const parsedQueryOrError = this.parseRequest(
			fetchAllGymsQuerySchema,
			req.query,
		)
		if (parsedQueryOrError.isFailure()) {
			return this.createResponseError(parsedQueryOrError)
		}

		const result = await this.fetchAllGymsUseCase.execute({
			page: parsedQueryOrError.value.page ?? 1,
		})
		return ResponseFactory.create({
			status: HTTP_STATUS.OK,
			body: { gyms: result.data, pagination: result.pagination },
		})
	}
```

Trecho após a mudança:
```typescript
	@Logger({ message: "✅" })
	public async init(): Promise<void> {
		this.server.register(
			"get",
			GymRoutes.LIST,
			{ callback: this.callback, isProtected: true },
			makeFetchAllGymsSwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest) {
		const parsedQueryOrError = this.parseRequest(
			fetchAllGymsQuerySchema,
			req.query,
		)
		if (parsedQueryOrError.isFailure()) {
			return this.createResponseError(parsedQueryOrError)
		}

		const isAdmin = req.user?.sub.role === "ADMIN"
		const result = await this.fetchAllGymsUseCase.execute({
			page: parsedQueryOrError.value.page ?? 1,
			includeInactive: isAdmin,
		})
		return ResponseFactory.create({
			status: HTTP_STATUS.OK,
			body: { gyms: result.data, pagination: result.pagination },
		})
	}
```

`gymSummarySchema` atual:
```typescript
const gymSummarySchema = z.object({
	id: z.string().meta({
		description: "Gym ID",
		example: "550e8400-e29b-41d4-a716-446655440000",
	}),
	title: z.string().meta({ description: "Gym name", example: "Iron Gym" }),
	description: z.string().nullable().meta({ description: "Gym description" }),
	phone: z.string().nullable().meta({ description: "Gym phone number" }),
	address: z.string().nullable().meta({ description: "Full gym address" }),
	imageKey: z
		.string()
		.nullable()
		.meta({ description: "Relative key of the gym image" }),
	latitude: z.number().meta({ description: "Latitude", example: -23.5505 }),
	longitude: z.number().meta({ description: "Longitude", example: -46.6333 }),
})
```

`gymSummarySchema` após a mudança (adiciona `status`):
```typescript
const gymSummarySchema = z.object({
	id: z.string().meta({
		description: "Gym ID",
		example: "550e8400-e29b-41d4-a716-446655440000",
	}),
	title: z.string().meta({ description: "Gym name", example: "Iron Gym" }),
	description: z.string().nullable().meta({ description: "Gym description" }),
	phone: z.string().nullable().meta({ description: "Gym phone number" }),
	address: z.string().nullable().meta({ description: "Full gym address" }),
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

`FetchAllGymsUseCase.execute()` já aceita `includeInactive?: boolean` desde a Task 7, e o
DTO retornado já inclui `status` — nenhuma outra mudança é necessária no use case.

- **Step 4: Rodar o teste e confirmar que passa**

Run: `pnpm --filter backend test:run -- -t "FetchAllGymsController"`
Expected: PASS — os 3 casos de teste passam.

- **Step 5: Commit**

```bash
git add apps/backend/src/gym/infra/controller/fetch-all-gyms.controller.ts \
  apps/backend/src/gym/infra/controller/fetch-all-gyms.controller.test.ts
git commit -m "feat(gym): require auth and filter deactivated gyms by role on gym listing"
```

## Critérios de Sucesso

- `GET /gyms` exige autenticação (`isProtected: true`) — uma requisição sem token retorna 401
  (alinhando o runtime ao `security: true` já declarado no Swagger).
- Um admin autenticado recebe academias desativadas na listagem, cada uma com
  `status: "deactivated"` (FR-009).
- Um usuário comum autenticado não recebe academias desativadas na listagem (FR-006).
- `gymSummarySchema` (documentação Swagger) inclui `status: "activated" | "deactivated"` para
  todo item retornado (FR-012).
- `pnpm --filter backend test:run -- -t "FetchAllGymsController"` passa com os 3 casos
  mínimos.
