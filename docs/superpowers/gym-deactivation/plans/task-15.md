# Task 15: `FetchGymByIdController` — `isProtected: true` + papel repassado [FR-008, FR-009]

**Status:** PENDING
**PRD:** `../prd/prd-gym-deactivation.md`
**Spec:** `../specs/gym-deactivation-design.md`
**Tier:** cheap
**Depends on:** task-09

## Visão Geral

Mesmo tratamento das Tasks 13 e 14, aplicado a `FetchGymByIdController` (detalhe de uma
academia por id). A rota passa a exigir autenticação (`isProtected: true`, sem `onlyAdmin`),
alinhando o runtime ao `security: true` já declarado em seu Swagger. O controller calcula
`isAdmin = req.user?.sub.role === "ADMIN"` e repassa `includeInactive: isAdmin` para
`FetchGymByIdUseCase.execute()` (Task 9). A Decisão D2 (não revelar a um usuário comum que
uma academia desativada existe) já é automaticamente coberta pelo branch existente
`if (result.isFailure()) return this.createResponseError(result)`: quando
`includeInactive: false`, o use case retorna `failure(GymNotFoundError)` para uma academia
desativada, e o controller já mapeia esse erro para 404 sem nenhuma mudança adicional — o
mesmo 404 usado para um `gymId` que nunca existiu. O schema de resposta `gymResponseSchema`
ganha `status`.

**Nota de compatibilidade:** com `isProtected: true`, uma requisição sem token Bearer válido
agora recebe 401 em vez de 200/404.

## Arquivos

- Modify: `apps/backend/src/gym/infra/controller/fetch-gym-by-id.controller.ts`
- Test: `apps/backend/src/gym/infra/controller/fetch-gym-by-id.controller.test.ts`

### Conformidade com as Skills Padrão

- `typescript-advanced`: leitura tipada de `req.user?.sub.role`, extensão do schema `zod` de
  resposta com `status`.
- `vitest`: suíte de teste HTTP via `supertest` + `serverBuildForTest()`, seguindo a mesma
  convenção usada nas Tasks 13/14.
- `no-workarounds`: reusar o branch de erro já existente (`result.isFailure()` →
  `createResponseError`) para cobrir a Decisão D2, em vez de adicionar um `if` extra que
  checasse `status === "deactivated"` manualmente no controller — a ocultação é
  responsabilidade do use case/repositório, não do controller.

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

describe("FetchGymByIdController — includeInactive por papel", () => {
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
		const gym = await createAndSaveGym({ gymRepository })

		const response = await request(fastifyServer.server).get(
			GymRoutes.GET.replace(":gymId", gym.id),
		)

		expect(response.status).toBe(401)
	})

	test("admin autenticado vê o detalhe de uma academia desativada, com status 'deactivated'", async () => {
		const token = await getTokenForRole(RoleValues.ADMIN)
		const gym = await createAndSaveGym({ gymRepository })
		gym.deactivate()
		await gymRepository.update(gym)

		const response = await request(fastifyServer.server)
			.get(GymRoutes.GET.replace(":gymId", gym.id))
			.set("Authorization", `Bearer ${token}`)

		expect(response.status).toBe(200)
		expect(response.body.status).toBe("deactivated")
	})

	test("usuário comum autenticado recebe 404 ao acessar o detalhe de uma academia desativada", async () => {
		const token = await getTokenForRole(RoleValues.MEMBER)
		const gym = await createAndSaveGym({ gymRepository })
		gym.deactivate()
		await gymRepository.update(gym)

		const response = await request(fastifyServer.server)
			.get(GymRoutes.GET.replace(":gymId", gym.id))
			.set("Authorization", `Bearer ${token}`)

		expect(response.status).toBe(404)
	})

	test("usuário comum autenticado recebe o mesmo 404 para gymId inexistente", async () => {
		const token = await getTokenForRole(RoleValues.MEMBER)

		const response = await request(fastifyServer.server)
			.get(GymRoutes.GET.replace(":gymId", "non-existent-id"))
			.set("Authorization", `Bearer ${token}`)

		expect(response.status).toBe(404)
	})
})
```

- **Step 2: Rodar o teste e confirmar que falha**

Run: `pnpm --filter backend test:run -- -t "FetchGymByIdController"`
Expected: FAIL — a requisição sem token retorna 200/404 (rota ainda não é `isProtected`), e o
admin recebe 404 em vez de 200 para uma academia desativada (`includeInactive` ainda não é
repassado).

- **Step 3: Implementação mínima**

Trecho atual do `init` e do `callback`:
```typescript
	@Logger({ message: "✅" })
	public async init(): Promise<void> {
		this.server.register(
			"get",
			GymRoutes.GET,
			{ callback: this.callback },
			makeFetchGymByIdSwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest) {
		const parsedParamsOrError = this.parseRequest(
			fetchGymByIdParamsSchema,
			req.params,
		)
		if (parsedParamsOrError.isFailure()) {
			return this.createResponseError(parsedParamsOrError)
		}

		const result = await this.fetchGymByIdUseCase.execute({
			gymId: parsedParamsOrError.value.gymId,
		})
		if (result.isFailure()) {
			return this.createResponseError(result)
		}

		return ResponseFactory.create({
			status: HTTP_STATUS.OK,
			body: result.value,
		})
	}
```

Trecho após a mudança:
```typescript
	@Logger({ message: "✅" })
	public async init(): Promise<void> {
		this.server.register(
			"get",
			GymRoutes.GET,
			{ callback: this.callback, isProtected: true },
			makeFetchGymByIdSwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest) {
		const parsedParamsOrError = this.parseRequest(
			fetchGymByIdParamsSchema,
			req.params,
		)
		if (parsedParamsOrError.isFailure()) {
			return this.createResponseError(parsedParamsOrError)
		}

		const isAdmin = req.user?.sub.role === "ADMIN"
		const result = await this.fetchGymByIdUseCase.execute({
			gymId: parsedParamsOrError.value.gymId,
			includeInactive: isAdmin,
		})
		if (result.isFailure()) {
			return this.createResponseError(result)
		}

		return ResponseFactory.create({
			status: HTTP_STATUS.OK,
			body: result.value,
		})
	}
```

`gymResponseSchema` atual:
```typescript
const gymResponseSchema = z.object({
	id: z.string().meta({
		description: "Gym ID",
		example: "550e8400-e29b-41d4-a716-446655440000",
	}),
	cnpj: z.string().meta({ description: "Gym CNPJ", example: "12345678000100" }),
	title: z.string().meta({ description: "Gym name", example: "Iron Gym" }),
	description: z.string().nullable().meta({ description: "Gym description" }),
	phone: z.string().nullable().meta({ description: "Gym phone number" }),
	address: z.string().nullable().meta({ description: "Full gym address" }),
	imageKey: z.string().nullable().meta({
		description: "Relative key of the gym image",
		example: "gyms/abc.webp",
	}),
	latitude: z.number().meta({ description: "Latitude", example: -23.5505 }),
	longitude: z.number().meta({ description: "Longitude", example: -46.6333 }),
})
```

`gymResponseSchema` após a mudança (adiciona `status`):
```typescript
const gymResponseSchema = z.object({
	id: z.string().meta({
		description: "Gym ID",
		example: "550e8400-e29b-41d4-a716-446655440000",
	}),
	cnpj: z.string().meta({ description: "Gym CNPJ", example: "12345678000100" }),
	title: z.string().meta({ description: "Gym name", example: "Iron Gym" }),
	description: z.string().nullable().meta({ description: "Gym description" }),
	phone: z.string().nullable().meta({ description: "Gym phone number" }),
	address: z.string().nullable().meta({ description: "Full gym address" }),
	imageKey: z.string().nullable().meta({
		description: "Relative key of the gym image",
		example: "gyms/abc.webp",
	}),
	latitude: z.number().meta({ description: "Latitude", example: -23.5505 }),
	longitude: z.number().meta({ description: "Longitude", example: -46.6333 }),
	status: z
		.enum(["activated", "deactivated"])
		.meta({ description: "Gym status", example: "activated" }),
})
```

`FetchGymByIdUseCase.execute()` já aceita `includeInactive?: boolean` desde a Task 9, já
retorna `failure(GymNotFoundError)` para uma academia desativada com `includeInactive: false`,
e o DTO de sucesso já inclui `status` — nenhuma outra mudança é necessária no use case.

- **Step 4: Rodar o teste e confirmar que passa**

Run: `pnpm --filter backend test:run -- -t "FetchGymByIdController"`
Expected: PASS — os 4 casos de teste passam.

- **Step 5: Commit**

```bash
git add apps/backend/src/gym/infra/controller/fetch-gym-by-id.controller.ts \
  apps/backend/src/gym/infra/controller/fetch-gym-by-id.controller.test.ts
git commit -m "feat(gym): require auth and hide deactivated gym detail from non-admins"
```

## Critérios de Sucesso

- `GET /gyms/:gymId` exige autenticação (`isProtected: true`) — uma requisição sem token
  retorna 401.
- Um admin autenticado vê o detalhe de uma academia desativada com `status: "deactivated"`
  (FR-009).
- Um usuário comum autenticado recebe 404 ao acessar o detalhe de uma academia desativada —
  exatamente o mesmo 404 usado para um `gymId` inexistente, sem diferenciação (FR-008,
  Decisão D2).
- `gymResponseSchema` inclui `status: "activated" | "deactivated"` na resposta (FR-012).
- `pnpm --filter backend test:run -- -t "FetchGymByIdController"` passa com os 4 casos
  mínimos.
