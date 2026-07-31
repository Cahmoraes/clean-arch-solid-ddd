# Task 12: `ActivateGymController` + rota + DI [FR-002, FR-005]

**Status:** DONE
**PRD:** `../prd/prd-gym-deactivation.md`
**Spec:** `../specs/gym-deactivation-design.md`
**Tier:** cheap
**Depends on:** task-06, task-11

## Visão Geral

Cria `ActivateGymController`, mirror exato de `DeactivateGymController` (Task 11), expondo
`PATCH /gyms/:gymId/activate`, protegido só-admin. **Esta task roda estritamente depois da
Task 11** (Wave 6, sequencial — nunca em paralelo com a Task 11, pois as duas escrevem em
`gym-module.ts`).

**Coordenação com a Task 11 (ler antes de implementar):** a Task 11 já registrou em
`gym-routes.ts` a constante `GymRoutes.ACTIVATE` e em `gym-types.ts` os símbolos
`GYM_TYPES.UseCases.ActivateGym` e `GYM_TYPES.Controllers.ActivateGym`, e em `gym-module.ts`
já registrou os binds de `DeactivateGym`. **Esta Task 12 não toca em `gym-routes.ts` nem em
`gym-types.ts`** — apenas consome o que já existe. Em `gym-module.ts`, esta Task 12
**adiciona** o import e os 2 binds de `ActivateGym`, sem remover ou duplicar os binds de
`DeactivateGym` já existentes.

## Arquivos

- Create: `apps/backend/src/gym/infra/controller/activate-gym.controller.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/gym/gym-module.ts`
- Test: `apps/backend/src/gym/infra/controller/activate-gym.controller.test.ts`

### Conformidade com as Skills Padrão

- `typescript-advanced`: schema `zod` para `params` de rota, tipagem de `FastifyRequest` e do
  retorno do `callback`.
- `vitest`: suíte de teste HTTP via `supertest` + `serverBuildForTest()`, seguindo a mesma
  convenção de `apps/backend/test/contract/gym.contract-test.ts` usada na Task 11.
- `no-workarounds`: propagar o `Either` de erro do use case (`GymNotFoundError`/
  `GymAlreadyActivatedError`) via `this.createResponseError(result)`, sem capturar/mascarar o
  erro manualmente no controller.

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

describe("ActivateGymController", () => {
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

	async function getAdminToken(): Promise<string> {
		await createAndSaveUser({
			userRepository,
			email: "admin@test.com",
			password: "any_password",
			role: RoleValues.ADMIN,
		})
		const result = await authenticate.execute({
			email: "admin@test.com",
			password: "any_password",
		})
		return result.force.success().value.token
	}

	async function getMemberToken(): Promise<string> {
		await createAndSaveUser({
			userRepository,
			email: "member@test.com",
			password: "any_password",
			role: RoleValues.MEMBER,
		})
		const result = await authenticate.execute({
			email: "member@test.com",
			password: "any_password",
		})
		return result.force.success().value.token
	}

	test("admin reativa uma academia desativada e recebe 200", async () => {
		const token = await getAdminToken()
		const gym = await createAndSaveGym({ gymRepository })
		gym.deactivate()
		await gymRepository.update(gym)

		const response = await request(fastifyServer.server)
			.patch(GymRoutes.ACTIVATE.replace(":gymId", gym.id))
			.set("Authorization", `Bearer ${token}`)

		expect(response.status).toBe(200)
		expect(response.body).toEqual({ message: "Gym activated" })
	})

	test("usuário não-admin recebe 403 ao tentar reativar uma academia", async () => {
		const token = await getMemberToken()
		const gym = await createAndSaveGym({ gymRepository })
		gym.deactivate()
		await gymRepository.update(gym)

		const response = await request(fastifyServer.server)
			.patch(GymRoutes.ACTIVATE.replace(":gymId", gym.id))
			.set("Authorization", `Bearer ${token}`)

		expect(response.status).toBe(403)
	})

	test("reativar um gymId inexistente retorna 404", async () => {
		const token = await getAdminToken()

		const response = await request(fastifyServer.server)
			.patch(GymRoutes.ACTIVATE.replace(":gymId", "non-existent-id"))
			.set("Authorization", `Bearer ${token}`)

		expect(response.status).toBe(404)
	})

	test("reativar uma academia já ativa retorna 409", async () => {
		const token = await getAdminToken()
		const gym = await createAndSaveGym({ gymRepository })

		const response = await request(fastifyServer.server)
			.patch(GymRoutes.ACTIVATE.replace(":gymId", gym.id))
			.set("Authorization", `Bearer ${token}`)

		expect(response.status).toBe(409)
	})
})
```

- **Step 2: Rodar o teste e confirmar que falha**

Run: `pnpm --filter backend test:run -- -t "ActivateGymController"`
Expected: FAIL — `activate-gym.controller.ts` ainda não existe e/ou o bind de
`ActivateGymController` em `gym-module.ts` ainda não aponta para uma classe real.

- **Step 3: Implementação mínima**

`activate-gym.controller.ts` (mirror de `deactivate-gym.controller.ts`):
```typescript
import type { FastifyRequest } from "fastify"
import { inject } from "inversify"
import { z } from "zod"
import type { ActivateGymUseCase } from "@/gym/application/use-case/activate-gym.usecase"
import { BaseController } from "@/shared/infra/controller/base-controller"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory"
import { Logger } from "@/shared/infra/decorator/logger"
import { GYM_TYPES, SHARED_TYPES } from "@/shared/infra/ioc/types"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type { HttpServer, Schema } from "@/shared/infra/server/http-server"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"
import { GymRoutes } from "./routes/gym-routes"

const activateGymParamsSchema = z.object({
	gymId: z.string().min(1).meta({
		description: "Gym ID",
		example: "550e8400-e29b-41d4-a716-446655440000",
	}),
})

export class ActivateGymController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly server: HttpServer,
		@inject(GYM_TYPES.UseCases.ActivateGym)
		private readonly activateGymUseCase: ActivateGymUseCase,
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
			"patch",
			GymRoutes.ACTIVATE,
			{ callback: this.callback, isProtected: true, onlyAdmin: true },
			makeActivateGymSwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest) {
		const parsedParamsOrError = this.parseRequest(activateGymParamsSchema, req.params)
		if (parsedParamsOrError.isFailure()) {
			return this.createResponseError(parsedParamsOrError)
		}
		const result = await this.activateGymUseCase.execute({
			gymId: parsedParamsOrError.value.gymId,
		})
		if (result.isFailure()) {
			return this.createResponseError(result)
		}
		return ResponseFactory.create({
			status: HTTP_STATUS.OK,
			body: { message: "Gym activated" },
		})
	}
}

function makeActivateGymSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["gyms"],
		summary: "Activate a gym",
		description:
			"Reactivates a previously deactivated gym, making it visible in listings/search again and allowing new check-ins. Requires ADMIN role",
		security: true,
		params: activateGymParamsSchema,
		responses: {
			200: {
				description: "Gym activated successfully",
				schema: z.object({ message: z.string().meta({ example: "Gym activated" }) }),
			},
			404: {
				description: "Gym not found",
				schema: z.object({ message: z.string() }),
			},
			409: {
				description: "Conflict - gym is already activated",
				schema: z.object({ message: z.string() }),
			},
		},
	})
}
```

`gym-module.ts` — adicionar o import e os 2 binds de `ActivateGym`, sem remover os binds de
Deactivate já registrados pela Task 11:
```typescript
import { ActivateGymUseCase } from "@/gym/application/use-case/activate-gym.usecase"
import { ActivateGymController } from "@/gym/infra/controller/activate-gym.controller"
// ... (mantém os imports já existentes, incluindo os da Task 11)

export const gymModule = new ContainerModule(({ bind }) => {
	// ... (mantém todos os binds já existentes, incluindo os de Deactivate da Task 11)
	bind(GYM_TYPES.Controllers.ActivateGym).to(ActivateGymController)
	bind(GYM_TYPES.UseCases.ActivateGym).to(ActivateGymUseCase)
})
```

Não editar `gym-routes.ts` nem `gym-types.ts` — `GymRoutes.ACTIVATE`,
`GYM_TYPES.UseCases.ActivateGym` e `GYM_TYPES.Controllers.ActivateGym` já foram registrados
pela Task 11.

- **Step 4: Rodar o teste e confirmar que passa**

Run: `pnpm --filter backend test:run -- -t "ActivateGymController"`
Expected: PASS — os 4 casos de teste passam.

- **Step 5: Commit**

```bash
git add apps/backend/src/gym/infra/controller/activate-gym.controller.ts \
  apps/backend/src/gym/infra/controller/activate-gym.controller.test.ts \
  apps/backend/src/shared/infra/ioc/module/gym/gym-module.ts
git commit -m "feat(gym): add ActivateGymController and DI wiring"
```

## Critérios de Sucesso

- `PATCH /gyms/:gymId/activate` exige autenticação e papel ADMIN (`isProtected: true,
  onlyAdmin: true`) — um usuário não-admin recebe 403 (FR-005).
- Um admin autenticado que reativa uma academia desativada recebe 200 com
  `{ message: "Gym activated" }` (FR-002).
- Reativar um `gymId` inexistente retorna 404; reativar uma academia já ativa retorna 409
  (`GymAlreadyActivatedError` mapeado via `STATUS_BY_ERROR_KIND`).
- Nenhuma duplicidade ou remoção acidental dos binds de `DeactivateGym` já registrados pela
  Task 11 em `gym-module.ts`.
- `pnpm --filter backend test:run -- -t "ActivateGymController"` passa com os 4 casos
  mínimos.
