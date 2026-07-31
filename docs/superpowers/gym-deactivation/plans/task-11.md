# Task 11: `DeactivateGymController` + rota + DI [FR-001, FR-005]

**Status:** DONE
**PRD:** `../prd/prd-gym-deactivation.md`
**Spec:** `../specs/gym-deactivation-design.md`
**Tier:** cheap
**Depends on:** task-05

## Visão Geral

Cria `DeactivateGymController`, mirror exato de `UpdateGymController` (rota protegida
só-admin, sem body, só `params`), expondo `PATCH /gyms/:gymId/deactivate`. Esta task também
registra a infraestrutura compartilhada de rota e DI (`gym-routes.ts`, `gym-types.ts`,
`gym-module.ts`) — inclusive as entradas de `Activate` em `gym-routes.ts`/`gym-types.ts`
(constantes/símbolos, sem import de classe, portanto sem risco de referência circular), para
que a Task 12 não precise tocar nesses dois arquivos.

**Coordenação com a Task 12 (crítico — ler antes de implementar):** a Task 12 **depende
desta Task 11** e roda estritamente depois dela (Wave 5 → Wave 6 sequencial, nunca em
paralelo — as duas tasks escrevem em `gym-module.ts` e um merge concorrente causaria conflito
ou perderia um dos dois binds). Esta Task 11 registra em `gym-routes.ts` as DUAS rotas
(`DEACTIVATE` e `ACTIVATE`) e em `gym-types.ts` os símbolos de AMBOS os use cases e
controllers (Deactivate e Activate) — são apenas literais/`Symbol.for()`, sem depender de
nenhuma classe que a Task 12 ainda vai criar. Em `gym-module.ts`, esta Task 11 registra
**apenas** os binds de `DeactivateGym` (controller + use case) — o arquivo
`activate-gym.controller.ts` ainda não existe neste ponto, então importar
`ActivateGymController` aqui quebraria a compilação. A Task 12 adiciona os binds de
`ActivateGym` no mesmo `gym-module.ts` depois, sem remover os de Deactivate.

## Arquivos

- Create: `apps/backend/src/gym/infra/controller/deactivate-gym.controller.ts`
- Modify: `apps/backend/src/gym/infra/controller/routes/gym-routes.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/service-identifier/gym-types.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/gym/gym-module.ts`
- Test: `apps/backend/src/gym/infra/controller/deactivate-gym.controller.test.ts`

### Conformidade com as Skills Padrão

- `typescript-advanced`: schemas `zod` para params de rota, tipagem de `FastifyRequest` e do
  retorno do `callback`.
- `vitest`: suíte de teste HTTP via `supertest` + `serverBuildForTest()`, seguindo a
  convenção real de `apps/backend/test/contract/gym.contract-test.ts`.
- `no-workarounds`: propagar o `Either` de erro do use case (`GymNotFoundError`/
  `GymAlreadyDeactivatedError`) via `this.createResponseError(result)`, sem capturar/mascarar
  o erro manualmente no controller.

**Este é um comportamento crítico de autorização — mantenha a task isolada, não funda com
nenhuma outra task.**

## Passos

- **Step 1: Escrever o teste que falha**

Não existe hoje nenhum arquivo `*.controller.test.ts` real no bounded context `gym` (o único
teste de controller existente no repo é `apps/backend/src/shared/infra/controller/base-controller.test.ts`,
que testa a classe abstrata `BaseController` isoladamente, não uma rota concreta). O
precedente real mais próximo de um teste HTTP de controller concreto é
`apps/backend/test/contract/gym.contract-test.ts`, que usa `supertest` +
`serverBuildForTest()` + `container.snapshot()`/`rebind`/`restore()`. Este teste reaproveita
esse padrão, mas **sem** `expect(response).toSatisfyApiSpec()` — manter/atualizar o contrato
OpenAPI mestre é fora do escopo desta feature; validar apenas `status`/`body` da resposta.

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

describe("DeactivateGymController", () => {
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

	test("admin desativa uma academia ativa e recebe 200", async () => {
		const token = await getAdminToken()
		const gym = await createAndSaveGym({ gymRepository })

		const response = await request(fastifyServer.server)
			.patch(GymRoutes.DEACTIVATE.replace(":gymId", gym.id))
			.set("Authorization", `Bearer ${token}`)

		expect(response.status).toBe(200)
		expect(response.body).toEqual({ message: "Gym deactivated" })
	})

	test("usuário não-admin recebe 403 ao tentar desativar uma academia", async () => {
		const token = await getMemberToken()
		const gym = await createAndSaveGym({ gymRepository })

		const response = await request(fastifyServer.server)
			.patch(GymRoutes.DEACTIVATE.replace(":gymId", gym.id))
			.set("Authorization", `Bearer ${token}`)

		expect(response.status).toBe(403)
	})

	test("desativar um gymId inexistente retorna 404", async () => {
		const token = await getAdminToken()

		const response = await request(fastifyServer.server)
			.patch(GymRoutes.DEACTIVATE.replace(":gymId", "non-existent-id"))
			.set("Authorization", `Bearer ${token}`)

		expect(response.status).toBe(404)
	})

	test("desativar uma academia já desativada retorna 409", async () => {
		const token = await getAdminToken()
		const gym = await createAndSaveGym({ gymRepository })
		gym.deactivate()
		await gymRepository.update(gym)

		const response = await request(fastifyServer.server)
			.patch(GymRoutes.DEACTIVATE.replace(":gymId", gym.id))
			.set("Authorization", `Bearer ${token}`)

		expect(response.status).toBe(409)
	})
})
```

- **Step 2: Rodar o teste e confirmar que falha**

Run: `pnpm --filter backend test:run -- -t "DeactivateGymController"`
Expected: FAIL — `GymRoutes.DEACTIVATE` é `undefined` (rota ainda não registrada) e
`deactivate-gym.controller.ts` ainda não existe.

- **Step 3: Implementação mínima**

`gym-routes.ts` atual:
```typescript
export const GymRoutes = {
	CREATE: "/gyms",
	LIST: "/gyms",
	GET: "/gyms/:gymId",
	UPDATE: "/gyms/:gymId",
	UPLOAD_IMAGE: "/gyms/:gymId/image",
	SEARCH: "/gyms/search/:name",
} as const
```

`gym-routes.ts` após a mudança (adiciona AMBAS as rotas, Deactivate e Activate):
```typescript
export const GymRoutes = {
	CREATE: "/gyms",
	LIST: "/gyms",
	GET: "/gyms/:gymId",
	UPDATE: "/gyms/:gymId",
	UPLOAD_IMAGE: "/gyms/:gymId/image",
	SEARCH: "/gyms/search/:name",
	DEACTIVATE: "/gyms/:gymId/deactivate",
	ACTIVATE: "/gyms/:gymId/activate",
} as const
```

`gym-types.ts` atual:
```typescript
export const GYM_TYPES = {
	Repositories: { Gym: Symbol.for("GymRepository") },
	PG: { Gym: Symbol.for("PgGymRepository") },
	UseCases: {
		CreateGym: Symbol.for("CreateGymUseCase"),
		UpdateGym: Symbol.for("UpdateGymUseCase"),
		DeleteGym: Symbol.for("DeleteGymUseCase"),
		SearchGym: Symbol.for("SearchGymUseCase"),
		FetchNearbyGym: Symbol.for("FetchNearbyGymUseCase"),
		FetchAllGyms: Symbol.for("FetchAllGymsUseCase"),
		FetchGymById: Symbol.for("FetchGymByIdUseCase"),
		SetGymImage: Symbol.for("SetGymImageUseCase"),
	},
	Controllers: {
		CreateGym: Symbol.for("CreateGymController"),
		UpdateGym: Symbol.for("UpdateGymController"),
		SearchGym: Symbol.for("SearchGymController"),
		FetchNearbyGym: Symbol.for("FetchNearbyGymController"),
		FetchAllGyms: Symbol.for("FetchAllGymsController"),
		FetchGymById: Symbol.for("FetchGymByIdController"),
		GymImage: Symbol.for("GymImageController"),
	},
	Services: { ImageProcessor: Symbol.for("ImageProcessor"), ImageStorage: Symbol.for("ImageStorage") },
} as const
```

`gym-types.ts` após a mudança (adiciona AMBOS os símbolos, Deactivate e Activate):
```typescript
export const GYM_TYPES = {
	Repositories: { Gym: Symbol.for("GymRepository") },
	PG: { Gym: Symbol.for("PgGymRepository") },
	UseCases: {
		CreateGym: Symbol.for("CreateGymUseCase"),
		UpdateGym: Symbol.for("UpdateGymUseCase"),
		DeleteGym: Symbol.for("DeleteGymUseCase"),
		SearchGym: Symbol.for("SearchGymUseCase"),
		FetchNearbyGym: Symbol.for("FetchNearbyGymUseCase"),
		FetchAllGyms: Symbol.for("FetchAllGymsUseCase"),
		FetchGymById: Symbol.for("FetchGymByIdUseCase"),
		SetGymImage: Symbol.for("SetGymImageUseCase"),
		DeactivateGym: Symbol.for("DeactivateGymUseCase"),
		ActivateGym: Symbol.for("ActivateGymUseCase"),
	},
	Controllers: {
		CreateGym: Symbol.for("CreateGymController"),
		UpdateGym: Symbol.for("UpdateGymController"),
		SearchGym: Symbol.for("SearchGymController"),
		FetchNearbyGym: Symbol.for("FetchNearbyGymController"),
		FetchAllGyms: Symbol.for("FetchAllGymsController"),
		FetchGymById: Symbol.for("FetchGymByIdController"),
		GymImage: Symbol.for("GymImageController"),
		DeactivateGym: Symbol.for("DeactivateGymController"),
		ActivateGym: Symbol.for("ActivateGymController"),
	},
	Services: { ImageProcessor: Symbol.for("ImageProcessor"), ImageStorage: Symbol.for("ImageStorage") },
} as const
```

`deactivate-gym.controller.ts` (mirror de `update-gym.controller.ts`, sem body, só
`params`):
```typescript
import type { FastifyRequest } from "fastify"
import { inject } from "inversify"
import { z } from "zod"
import type { DeactivateGymUseCase } from "@/gym/application/use-case/deactivate-gym.usecase"
import { BaseController } from "@/shared/infra/controller/base-controller"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory"
import { Logger } from "@/shared/infra/decorator/logger"
import { GYM_TYPES, SHARED_TYPES } from "@/shared/infra/ioc/types"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type { HttpServer, Schema } from "@/shared/infra/server/http-server"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"
import { GymRoutes } from "./routes/gym-routes"

const deactivateGymParamsSchema = z.object({
	gymId: z.string().min(1).meta({
		description: "Gym ID",
		example: "550e8400-e29b-41d4-a716-446655440000",
	}),
})

export class DeactivateGymController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly server: HttpServer,
		@inject(GYM_TYPES.UseCases.DeactivateGym)
		private readonly deactivateGymUseCase: DeactivateGymUseCase,
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
			GymRoutes.DEACTIVATE,
			{ callback: this.callback, isProtected: true, onlyAdmin: true },
			makeDeactivateGymSwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest) {
		const parsedParamsOrError = this.parseRequest(deactivateGymParamsSchema, req.params)
		if (parsedParamsOrError.isFailure()) {
			return this.createResponseError(parsedParamsOrError)
		}
		const result = await this.deactivateGymUseCase.execute({
			gymId: parsedParamsOrError.value.gymId,
		})
		if (result.isFailure()) {
			return this.createResponseError(result)
		}
		return ResponseFactory.create({
			status: HTTP_STATUS.OK,
			body: { message: "Gym deactivated" },
		})
	}
}

function makeDeactivateGymSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["gyms"],
		summary: "Deactivate a gym",
		description:
			"Deactivates a gym so it stops appearing in listings/search and blocks new check-ins. Requires ADMIN role",
		security: true,
		params: deactivateGymParamsSchema,
		responses: {
			200: {
				description: "Gym deactivated successfully",
				schema: z.object({ message: z.string().meta({ example: "Gym deactivated" }) }),
			},
			404: {
				description: "Gym not found",
				schema: z.object({ message: z.string() }),
			},
			409: {
				description: "Conflict - gym is already deactivated",
				schema: z.object({ message: z.string() }),
			},
		},
	})
}
```

Método HTTP `"patch"` confirmado válido: `apps/backend/src/shared/infra/server/http-server.ts`
define `export type METHOD = "get" | "post" | "put" | "delete" | "patch" | "options"` — nenhum
ajuste necessário em relação ao código acima.

`gym-module.ts` — adicionar o import e os 2 binds de `DeactivateGym` (apenas — `ActivateGym`
é responsabilidade da Task 12, que roda depois):
```typescript
import { DeactivateGymUseCase } from "@/gym/application/use-case/deactivate-gym.usecase"
import { DeactivateGymController } from "@/gym/infra/controller/deactivate-gym.controller"
// ... (mantém os imports já existentes)

export const gymModule = new ContainerModule(({ bind }) => {
	// ... (mantém os binds já existentes)
	bind(GYM_TYPES.Controllers.DeactivateGym).to(DeactivateGymController)
	bind(GYM_TYPES.UseCases.DeactivateGym).to(DeactivateGymUseCase)
})
```
Não importar nem referenciar `ActivateGymController`/`ActivateGymUseCase` nesta task — o
arquivo `activate-gym.controller.ts` ainda não existe neste ponto; a rota e os símbolos em
`gym-routes.ts`/`gym-types.ts` já ficam registrados por esta Task 11, o que basta para a
Task 12 não precisar tocar nesses dois arquivos.

- **Step 4: Rodar o teste e confirmar que passa**

Run: `pnpm --filter backend test:run -- -t "DeactivateGymController"`
Expected: PASS — os 4 casos de teste passam.

- **Step 5: Commit**

```bash
git add apps/backend/src/gym/infra/controller/deactivate-gym.controller.ts \
  apps/backend/src/gym/infra/controller/deactivate-gym.controller.test.ts \
  apps/backend/src/gym/infra/controller/routes/gym-routes.ts \
  apps/backend/src/shared/infra/ioc/module/service-identifier/gym-types.ts \
  apps/backend/src/shared/infra/ioc/module/gym/gym-module.ts
git commit -m "feat(gym): add DeactivateGymController, route and DI wiring"
```

## Critérios de Sucesso

- `PATCH /gyms/:gymId/deactivate` exige autenticação e papel ADMIN (`isProtected: true,
  onlyAdmin: true`) — um usuário não-admin recebe 403 (FR-005).
- Um admin autenticado que desativa uma academia ativa recebe 200 com
  `{ message: "Gym deactivated" }` (FR-001).
- Desativar um `gymId` inexistente retorna 404; desativar uma academia já desativada retorna
  409 (`GymAlreadyDeactivatedError` mapeado via `STATUS_BY_ERROR_KIND`).
- `GymRoutes.DEACTIVATE` e `GymRoutes.ACTIVATE` estão ambas registradas em `gym-routes.ts`, e
  os símbolos `GYM_TYPES.UseCases.DeactivateGym`/`ActivateGym` e
  `GYM_TYPES.Controllers.DeactivateGym`/`ActivateGym` estão ambos registrados em
  `gym-types.ts`, preparando o terreno para a Task 12 sem exigir que ela edite esses dois
  arquivos.
- `pnpm --filter backend test:run -- -t "DeactivateGymController"` passa com os 4 casos
  mínimos.
