# Task 4: BulkActivateUsersController e rota PATCH /users/bulk-activate [FR-007, FR-012]

**Status:** PENDING
**PRD:** ../prd/prd-bulk-user-status-actions.md
**Spec:** ../specs/bulk-user-status-actions-design.md
**Tier:** standard
**Depends on:** task-03

## Visão Geral

Expor `BulkChangeUserStatusUseCase` (Task 03) via HTTP como uma rota dedicada
`PATCH /users/bulk-activate`, espelhando o padrão de `ActivateUserController`
(`isProtected: true`, `onlyAdmin: true`, rate limit de `RATE_LIMIT_CONFIG.AUTH`), mas
recebendo um array de `userIds` (1 a 100, primeiro uso de `z.array(...).min()/.max()` no
backend) em vez de um único `userId`. O controller fixa `targetStatus: "activated"` e
devolve o corpo agregado `{ updated, requested, skipped }` retornado pelo use case
(FR-012: rotas dedicadas por ação, em vez de uma única rota parametrizada por ação).

## Arquivos

- Create: `apps/backend/src/user/infra/controller/bulk-activate-users.controller.ts`
- Modify: `apps/backend/src/user/infra/controller/routes/user-routes.ts` (adicionar `BULK_ACTIVATE_USERS = "/users/bulk-activate"`)
- Modify: `apps/backend/src/shared/infra/ioc/module/service-identifier/user-types.ts` (adicionar `UseCases.BulkChangeUserStatus` e `Controllers.BulkActivateUsers`)
- Modify: `apps/backend/src/shared/infra/ioc/module/user/user-module.ts` (bindings do use case e do controller)
- Modify: `apps/backend/src/bootstrap/setup-user-module.ts` (registrar o novo controller na lista `controllers` resolvida no bootstrap — sem isso, `init()` nunca é chamado e a rota nunca é registrada no Fastify, mesmo com o binding de DI correto)
- Test: `apps/backend/src/user/infra/controller/bulk-activate-users.business-flow-test.ts`

### Conformidade com as Skills Padrão

- `typescript-advanced`: o schema Zod usa `z.array(z.string().uuid()).min(1).max(100)` — primeiro uso desse padrão no repositório, exige atenção ao tipo inferido (`string[]`) propagado até `BulkChangeUserStatusUseCaseInput.userIds`.
- `zod`: validar a sintaxe exata de `.min()`/`.max()` sobre `z.array(...)` na versão do Zod usada pelo projeto antes de escrever o schema, garantindo que os limites (1 a 100) e as mensagens de erro geradas por `zod-validation-error` (`fromError`, já usado em `BaseController.createBadRequest`) fiquem corretos.
- `context7`: consultar a documentação do Fastify sobre registro de rotas (`httpServer.register("patch", ...)`) já usada pelos outros controllers do módulo `user`, para garantir que o novo controller segue exatamente o mesmo contrato de `HttpServer`.
- `vitest`: o teste business-flow segue a convenção `describe`/`test` em português já usada em `promote-to-admin.business-flow-test.ts`.
- `test-antipatterns`: os testes fazem requisições HTTP reais via `supertest` contra o servidor de teste (`serverBuildForTest`), nunca mockando o `BulkChangeUserStatusUseCase` ou o controller — a cobertura precisa validar o pipeline completo (schema → controller → use case → repositório).

## Passos

- **Step 1: Escrever o teste business-flow falho — ativação em massa com seleção mista**

Criar `apps/backend/src/user/infra/controller/bulk-activate-users.business-flow-test.ts`:

```ts
import { randomUUID } from "node:crypto"
import request from "supertest"
import { createAndSaveUser } from "test/factory/create-and-save-user"
import { serverBuildForTest } from "test/factory/server-build-for-test"
import type { AuthenticateUseCase } from "@/session/application/use-case/authenticate.usecase"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { AUTH_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"
import { UserRoutes } from "./routes/user-routes"

describe("Ativação em massa de usuários", () => {
	let fastifyServer: FastifyAdapter
	let userRepository: InMemoryUserRepository
	let authenticate: AuthenticateUseCase
	let token: string

	beforeEach(async () => {
		container.snapshot()
		userRepository = new InMemoryUserRepository()
		container
			.rebind(USER_TYPES.Repositories.User)
			.toConstantValue(userRepository)
		authenticate = container.get<AuthenticateUseCase>(
			AUTH_TYPES.UseCases.Authenticate,
		)
		fastifyServer = await serverBuildForTest()
		await fastifyServer.ready()
		await createAndSaveUser({
			userRepository,
			id: randomUUID(),
			email: "auth@bulk-activate.test",
			password: "any_password",
			role: "ADMIN",
		})
		const result = await authenticate.execute({
			email: "auth@bulk-activate.test",
			password: "any_password",
		})
		token = result.force.success().value.token
	})

	afterEach(async () => {
		container.restore()
		await fastifyServer.close()
	})

	test("Deve ativar em massa uma seleção mista e responder 200 com updated/requested/skipped", async () => {
		const member1Id = randomUUID()
		const member2Id = randomUUID()
		const otherAdminId = randomUUID()
		const member1 = await createAndSaveUser({
			userRepository,
			id: member1Id,
			email: "member1@bulk-activate.test",
			role: "MEMBER",
		})
		member1.suspend()
		await userRepository.update(member1)
		await createAndSaveUser({
			userRepository,
			id: member2Id,
			email: "member2@bulk-activate.test",
			role: "MEMBER",
		})
		await createAndSaveUser({
			userRepository,
			id: otherAdminId,
			email: "other-admin@bulk-activate.test",
			role: "ADMIN",
		})

		const response = await request(fastifyServer.server)
			.patch(UserRoutes.BULK_ACTIVATE_USERS)
			.set("Authorization", `Bearer ${token}`)
			.send({ userIds: [member1Id, member2Id, otherAdminId] })

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body).toEqual({ updated: 1, requested: 3, skipped: 2 })
		const updatedMember1 = await userRepository.userOfId(member1Id)
		expect(updatedMember1?.status).toBe("activated")
	})
})
```

- **Step 2: Rodar o teste para confirmar a falha**

Run: `pnpm --filter backend test:business-flow -- src/user/infra/controller/bulk-activate-users.business-flow-test.ts`
Expected: FAIL — `UserRoutes.BULK_ACTIVATE_USERS` não existe (erro de compilação) e a rota `/users/bulk-activate` retorna 404 (nada está registrado ainda).

- **Step 3: Adicionar a rota, os service identifiers e implementar o controller**

Em `apps/backend/src/user/infra/controller/routes/user-routes.ts`, adicionar ao objeto `UserRoutes` (logo após `SUSPEND_USER`):

```ts
	BULK_ACTIVATE_USERS: `${PREFIX}/bulk-activate`,
```

Em `apps/backend/src/shared/infra/ioc/module/service-identifier/user-types.ts`, adicionar em `UseCases` (após `SuspendUser`) e em `Controllers` (após `SuspendUser`):

```ts
	UseCases: {
		// ...chaves existentes inalteradas...
		SuspendUser: Symbol.for("SuspendUserUseCase"),
		BulkChangeUserStatus: Symbol.for("BulkChangeUserStatusUseCase"),
	},
	Controllers: {
		// ...chaves existentes inalteradas...
		SuspendUser: Symbol.for("SuspendUserController"),
		BulkActivateUsers: Symbol.for("BulkActivateUsersController"),
	},
```

Criar `apps/backend/src/user/infra/controller/bulk-activate-users.controller.ts`:

```ts
import type { FastifyRequest } from "fastify"
import { inject } from "inversify"
import { z } from "zod"
import { BaseController } from "@/shared/infra/controller/base-controller"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory"
import { Logger } from "@/shared/infra/decorator/logger"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type { HttpServer, Schema } from "@/shared/infra/server/http-server"
import { RATE_LIMIT_CONFIG } from "@/shared/infra/server/plugins/rate-limit-config.js"
import type { BulkChangeUserStatusUseCase } from "@/user/application/use-case/bulk-change-user-status.usecase"
import { UserRoutes } from "./routes/user-routes"

const bulkActivateUsersSchema = z.object({
	userIds: z.array(z.string().uuid()).min(1).max(100).meta({
		description: "IDs dos usuários a ativar em massa (1 a 100)",
	}),
})

export class BulkActivateUsersController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly httpServer: HttpServer,
		@inject(USER_TYPES.UseCases.BulkChangeUserStatus)
		private readonly bulkChangeUserStatus: BulkChangeUserStatusUseCase,
	) {
		super()
		this.bindMethod()
	}

	private bindMethod() {
		this.callback = this.callback.bind(this)
	}

	@Logger({
		message: "✅",
	})
	public async init(): Promise<void> {
		this.httpServer.register(
			"patch",
			UserRoutes.BULK_ACTIVATE_USERS,
			{
				callback: this.callback,
				isProtected: true,
				onlyAdmin: true,
				rateLimit: {
					max: RATE_LIMIT_CONFIG.AUTH.MAX_MEMBER,
					timeWindow: RATE_LIMIT_CONFIG.AUTH.TIME_WINDOW,
				},
			},
			makeBulkActivateUsersSwaggerSchema(),
		)
	}

	public async callback(req: FastifyRequest) {
		const parseBodyResult = this.parseRequest(
			bulkActivateUsersSchema,
			req.body,
		)
		if (parseBodyResult.isFailure()) {
			return this.createResponseError(parseBodyResult)
		}

		const result = await this.bulkChangeUserStatus.execute({
			requesterId: req.user.sub.id,
			userIds: parseBodyResult.value.userIds,
			targetStatus: "activated",
		})

		if (result.isFailure()) {
			return this.createResponseError(result)
		}

		return ResponseFactory.OK({ body: result.value })
	}
}

const bulkActivateUsersResponseSchema = z.object({
	updated: z.number().meta({ description: "Quantidade de usuários efetivamente ativados" }),
	requested: z.number().meta({ description: "Quantidade de IDs solicitados na requisição" }),
	skipped: z.number().meta({
		description:
			"Quantidade de usuários ignorados (fora da política de permissão ou já no status alvo)",
	}),
})

const errorResponseSchema = z.object({
	message: z.string().meta({ description: "Error message" }),
})

function makeBulkActivateUsersSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["users"],
		summary: "Bulk activate users",
		description:
			"Activates multiple user accounts at once (1 to 100 IDs). Requires admin authentication.",
		security: true,
		body: bulkActivateUsersSchema,
		responses: {
			200: {
				description: "Users processed successfully",
				schema: bulkActivateUsersResponseSchema,
			},
			400: { description: "Bad Request", schema: errorResponseSchema },
			401: { description: "Unauthorized" },
			403: { description: "Forbidden", schema: errorResponseSchema },
		},
	})
}
```

Definir `bulkActivateUsersResponseSchema` com `z.object({ updated: z.number(), requested:
z.number(), skipped: z.number() })` (em vez de deixar a resposta `200` sem `schema`) é o
que faz `OpenApiSchemaBuilder` gerar um corpo de resposta tipado no spec OpenAPI exportado
por `pnpm --filter backend openapi:export` — sem isso, a resposta `200` cairia no ramo
`{ type: "object", properties: {}, additionalProperties: true }` de
`OpenApiSchemaBuilder.buildResponses` (ver
`apps/backend/src/shared/infra/openapi/openapi-schema-builder.ts`), e o tipo gerado em
`@repo/api-types` para `paths["/users/bulk-activate"]["patch"]["responses"][200]` não
teria os campos `updated`/`requested`/`skipped` tipados. Isso é obrigatório porque a Task
11 (`useBulkChangeUserStatus`) depende desse tipo gerado para `UseMutationResult<{ updated:
number, requested: number, skipped: number }, ...>` fazer type-check.

Em `apps/backend/src/shared/infra/ioc/module/user/user-module.ts`, adicionar os imports (junto aos demais imports de use cases/controllers) e os bindings (junto aos demais `bind(USER_TYPES...)`):

```ts
import { BulkChangeUserStatusUseCase } from "@/user/application/use-case/bulk-change-user-status.usecase"
import { BulkActivateUsersController } from "@/user/infra/controller/bulk-activate-users.controller"
```

```ts
	bind(USER_TYPES.UseCases.BulkChangeUserStatus).to(BulkChangeUserStatusUseCase)
	bind(USER_TYPES.Controllers.BulkActivateUsers).to(BulkActivateUsersController)
```

Em `apps/backend/src/bootstrap/setup-user-module.ts`, adicionar ao array `controllers` (o mesmo array que já resolve `USER_TYPES.Controllers.ActivateUser`/`SuspendUser` — sem esta linha, `BulkActivateUsersController.init()` nunca é chamado e a rota fica 404 mesmo com o binding de DI correto):

```ts
		resolve(USER_TYPES.Controllers.BulkActivateUsers),
```

- **Step 4: Rodar o teste para confirmar que passa**

Run: `pnpm --filter backend test:business-flow -- src/user/infra/controller/bulk-activate-users.business-flow-test.ts`
Expected: PASS

- **Step 5: Commit**

```bash
git add apps/backend/src/user/infra/controller/bulk-activate-users.controller.ts apps/backend/src/user/infra/controller/routes/user-routes.ts apps/backend/src/shared/infra/ioc/module/service-identifier/user-types.ts apps/backend/src/shared/infra/ioc/module/user/user-module.ts apps/backend/src/bootstrap/setup-user-module.ts apps/backend/src/user/infra/controller/bulk-activate-users.business-flow-test.ts
git commit -m "feat: adiciona rota PATCH /users/bulk-activate"
```

- **Step 6: Escrever os testes falhos de validação e autorização**

Adicionar ao mesmo arquivo de teste:

```ts
	test("Deve retornar 400 para array vazio", async () => {
		const response = await request(fastifyServer.server)
			.patch(UserRoutes.BULK_ACTIVATE_USERS)
			.set("Authorization", `Bearer ${token}`)
			.send({ userIds: [] })

		expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
	})

	test("Deve retornar 400 para mais de 100 IDs", async () => {
		const tooManyIds = Array.from({ length: 101 }, () => randomUUID())

		const response = await request(fastifyServer.server)
			.patch(UserRoutes.BULK_ACTIVATE_USERS)
			.set("Authorization", `Bearer ${token}`)
			.send({ userIds: tooManyIds })

		expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
	})

	test("Deve retornar 400 para UUID inválido na lista", async () => {
		const response = await request(fastifyServer.server)
			.patch(UserRoutes.BULK_ACTIVATE_USERS)
			.set("Authorization", `Bearer ${token}`)
			.send({ userIds: ["not-a-uuid"] })

		expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
	})

	test("Deve retornar 401 quando o JWT não é fornecido", async () => {
		const response = await request(fastifyServer.server)
			.patch(UserRoutes.BULK_ACTIVATE_USERS)
			.send({ userIds: [randomUUID()] })

		expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
	})

	test("Deve retornar 403 quando o requester não é admin (MEMBER)", async () => {
		await createAndSaveUser({
			userRepository,
			id: randomUUID(),
			email: "member@bulk-activate.test",
			password: "member_password",
			role: "MEMBER",
		})
		const memberResult = await authenticate.execute({
			email: "member@bulk-activate.test",
			password: "member_password",
		})
		const memberToken = memberResult.force.success().value.token

		const response = await request(fastifyServer.server)
			.patch(UserRoutes.BULK_ACTIVATE_USERS)
			.set("Authorization", `Bearer ${memberToken}`)
			.send({ userIds: [randomUUID()] })

		expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
	})

	test("Deve retornar 403 (NotAllowedToManageUserError) quando o requester deixou de existir", async () => {
		const requesterFound = await userRepository.userOfEmail(
			"auth@bulk-activate.test",
		)
		requesterFound?.delete()
		if (requesterFound) await userRepository.update(requesterFound)

		const response = await request(fastifyServer.server)
			.patch(UserRoutes.BULK_ACTIVATE_USERS)
			.set("Authorization", `Bearer ${token}`)
			.send({ userIds: [randomUUID()] })

		expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
		expect(response.body).toHaveProperty("message")
	})
```

- **Step 7: Rodar o arquivo de teste completo para confirmar que passa**

Run: `pnpm --filter backend test:business-flow -- src/user/infra/controller/bulk-activate-users.business-flow-test.ts`
Expected: PASS (7 testes)

- **Step 8: Rodar a suíte completa de backend e o type-check**

Run: `pnpm --filter backend test:run`
Expected: PASS

Run: `pnpm --filter backend tsc:check`
Expected: sem erros de tipo

- **Step 9: Commit final**

```bash
git add apps/backend/src/user/infra/controller/bulk-activate-users.business-flow-test.ts
git commit -m "test: cobre validação e autorização de PATCH /users/bulk-activate"
```

## Critérios de Sucesso

- `PATCH /users/bulk-activate` retorna `200` com `{ updated, requested, skipped }` para uma seleção mista de usuários elegíveis/inelegíveis (FR-007).
- A rota é protegida (`isProtected: true`, `onlyAdmin: true`) e devolve `401` sem JWT e `403` para requester `MEMBER` (FR-012).
- O schema `z.array(z.string().uuid()).min(1).max(100)` rejeita com `400` array vazio, mais de 100 IDs e UUIDs inválidos.
- Um requester que deixou de existir (soft-deleted) resulta em `403` via `NotAllowedToManageUserError`.
- O controller está de fato registrado no bootstrap (`setup-user-module.ts`) — a rota responde no servidor de teste real, não apenas nos bindings de DI.
- `pnpm --filter backend test:run` e `pnpm --filter backend tsc:check` passam sem erros.
