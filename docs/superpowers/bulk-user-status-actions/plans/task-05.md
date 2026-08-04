# Task 5: BulkDeactivateUsersController e rota PATCH /users/bulk-deactivate [FR-007, FR-012]

**Status:** PENDING
**PRD:** ../prd/prd-bulk-user-status-actions.md
**Spec:** ../specs/bulk-user-status-actions-design.md
**Tier:** standard
**Depends on:** task-03, task-04

## Visão Geral

Espelha a Task 04 para a ação de desativação em massa: uma rota dedicada
`PATCH /users/bulk-deactivate` que reaproveita a MESMA instância de
`BulkChangeUserStatusUseCase` (já registrada em `USER_TYPES.UseCases.BulkChangeUserStatus`
pela Task 04) fixando `targetStatus: "suspended"`, em vez de duplicar o use case
(FR-012: rotas dedicadas por ação, use case único e reaproveitado). Esta task não
depende dos arquivos criados na Task 04 (o binding do use case e a rota de ativação já
existem de forma independente após a Task 03), mas o binding do use case
`BulkChangeUserStatus` precisa já existir no container — e ele é adicionado pela Task 04
em `user-module.ts`/`user-types.ts`. Se este arquivo for lido isoladamente antes da
Task 04 ter sido aplicada, os trechos abaixo mostram exatamente o estado desses arquivos
compartilhados após a Task 04, para que a Task 05 possa ser aplicada de forma consistente
por cima.

## Arquivos

- Create: `apps/backend/src/user/infra/controller/bulk-deactivate-users.controller.ts`
- Modify: `apps/backend/src/user/infra/controller/routes/user-routes.ts` (adicionar `BULK_DEACTIVATE_USERS = "/users/bulk-deactivate"`)
- Modify: `apps/backend/src/shared/infra/ioc/module/service-identifier/user-types.ts` (adicionar `Controllers.BulkDeactivateUsers`)
- Modify: `apps/backend/src/shared/infra/ioc/module/user/user-module.ts` (binding do novo controller, reaproveitando o binding já existente de `USER_TYPES.UseCases.BulkChangeUserStatus`)
- Modify: `apps/backend/src/bootstrap/setup-user-module.ts` (registrar o novo controller na lista `controllers` do bootstrap — sem isso a rota não é registrada no Fastify)
- Test: `apps/backend/src/user/infra/controller/bulk-deactivate-users.business-flow-test.ts`

### Conformidade com as Skills Padrão

- `typescript-advanced`: mesmo schema `z.array(z.string().uuid()).min(1).max(100)` da Task 04 — reaproveitar exatamente o mesmo tipo inferido, sem duplicar interfaces.
- `zod`: confirmar que o mesmo padrão `.min()/.max()` sobre `z.array(...)` usado na Task 04 se comporta identicamente aqui (mesma versão do Zod, mesmo schema, apenas outro controller consumindo).
- `context7`: revalidar a documentação do Fastify sobre registro de múltiplas rotas `PATCH` distintas no mesmo `HttpServer` antes de registrar a segunda rota bulk, garantindo que não há colisão de path com `/users/bulk-activate`.
- `vitest`: teste business-flow segue a mesma convenção `describe`/`test` em português da Task 04.
- `test-antipatterns`: os testes fazem requisições HTTP reais via `supertest`, sem mockar `BulkChangeUserStatusUseCase` — a Task 05 reaproveita a mesma instância do use case da Task 03/04 e o teste deve provar isso through a resposta HTTP real, não via inspeção de bindings.

## Passos

- **Step 1: Escrever o teste business-flow falho — desativação em massa com seleção mista**

Criar `apps/backend/src/user/infra/controller/bulk-deactivate-users.business-flow-test.ts`:

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

describe("Desativação em massa de usuários", () => {
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
			email: "auth@bulk-deactivate.test",
			password: "any_password",
			role: "ADMIN",
		})
		const result = await authenticate.execute({
			email: "auth@bulk-deactivate.test",
			password: "any_password",
		})
		token = result.force.success().value.token
	})

	afterEach(async () => {
		container.restore()
		await fastifyServer.close()
	})

	test("Deve desativar em massa uma seleção mista e responder 200 com updated/requested/skipped", async () => {
		const member1Id = randomUUID()
		const member2Id = randomUUID()
		const otherAdminId = randomUUID()
		await createAndSaveUser({
			userRepository,
			id: member1Id,
			email: "member1@bulk-deactivate.test",
			role: "MEMBER",
		})
		const member2 = await createAndSaveUser({
			userRepository,
			id: member2Id,
			email: "member2@bulk-deactivate.test",
			role: "MEMBER",
		})
		member2.suspend()
		await userRepository.update(member2)
		await createAndSaveUser({
			userRepository,
			id: otherAdminId,
			email: "other-admin@bulk-deactivate.test",
			role: "ADMIN",
		})

		const response = await request(fastifyServer.server)
			.patch(UserRoutes.BULK_DEACTIVATE_USERS)
			.set("Authorization", `Bearer ${token}`)
			.send({ userIds: [member1Id, member2Id, otherAdminId] })

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body).toEqual({ updated: 1, requested: 3, skipped: 2 })
		const updatedMember1 = await userRepository.userOfId(member1Id)
		expect(updatedMember1?.status).toBe("suspended")
	})
})
```

- **Step 2: Rodar o teste para confirmar a falha**

Run: `pnpm --filter backend test:business-flow -- src/user/infra/controller/bulk-deactivate-users.business-flow-test.ts`
Expected: FAIL — `UserRoutes.BULK_DEACTIVATE_USERS` não existe e a rota `/users/bulk-deactivate` retorna 404.

- **Step 3: Adicionar a rota, o service identifier e implementar o controller**

Em `apps/backend/src/user/infra/controller/routes/user-routes.ts`, adicionar ao objeto `UserRoutes` (logo após `BULK_ACTIVATE_USERS`, adicionado na Task 04):

```ts
	BULK_DEACTIVATE_USERS: `${PREFIX}/bulk-deactivate`,
```

Em `apps/backend/src/shared/infra/ioc/module/service-identifier/user-types.ts`, adicionar em `Controllers` (após `BulkActivateUsers`, adicionado na Task 04):

```ts
	Controllers: {
		// ...chaves existentes inalteradas, incluindo BulkActivateUsers da Task 04...
		BulkActivateUsers: Symbol.for("BulkActivateUsersController"),
		BulkDeactivateUsers: Symbol.for("BulkDeactivateUsersController"),
	},
```

Criar `apps/backend/src/user/infra/controller/bulk-deactivate-users.controller.ts` (idêntico ao `BulkActivateUsersController` da Task 04, trocando apenas o nome da classe, o resumo do Swagger e `targetStatus`):

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

const bulkDeactivateUsersSchema = z.object({
	userIds: z.array(z.string().uuid()).min(1).max(100).meta({
		description: "IDs dos usuários a desativar em massa (1 a 100)",
	}),
})

export class BulkDeactivateUsersController extends BaseController {
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
			UserRoutes.BULK_DEACTIVATE_USERS,
			{
				callback: this.callback,
				isProtected: true,
				onlyAdmin: true,
				rateLimit: {
					max: RATE_LIMIT_CONFIG.AUTH.MAX_MEMBER,
					timeWindow: RATE_LIMIT_CONFIG.AUTH.TIME_WINDOW,
				},
			},
			makeBulkDeactivateUsersSwaggerSchema(),
		)
	}

	public async callback(req: FastifyRequest) {
		const parseBodyResult = this.parseRequest(
			bulkDeactivateUsersSchema,
			req.body,
		)
		if (parseBodyResult.isFailure()) {
			return this.createResponseError(parseBodyResult)
		}

		const result = await this.bulkChangeUserStatus.execute({
			requesterId: req.user.sub.id,
			userIds: parseBodyResult.value.userIds,
			targetStatus: "suspended",
		})

		if (result.isFailure()) {
			return this.createResponseError(result)
		}

		return ResponseFactory.OK({ body: result.value })
	}
}

const bulkDeactivateUsersResponseSchema = z.object({
	updated: z.number().meta({ description: "Quantidade de usuários efetivamente desativados" }),
	requested: z.number().meta({ description: "Quantidade de IDs solicitados na requisição" }),
	skipped: z.number().meta({
		description:
			"Quantidade de usuários ignorados (fora da política de permissão ou já no status alvo)",
	}),
})

const errorResponseSchema = z.object({
	message: z.string().meta({ description: "Error message" }),
})

function makeBulkDeactivateUsersSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["users"],
		summary: "Bulk deactivate users",
		description:
			"Suspends multiple user accounts at once (1 to 100 IDs). Requires admin authentication.",
		security: true,
		body: bulkDeactivateUsersSchema,
		responses: {
			200: {
				description: "Users processed successfully",
				schema: bulkDeactivateUsersResponseSchema,
			},
			400: { description: "Bad Request", schema: errorResponseSchema },
			401: { description: "Unauthorized" },
			403: { description: "Forbidden", schema: errorResponseSchema },
		},
	})
}
```

Definir `bulkDeactivateUsersResponseSchema` com `z.object({ updated: z.number(), requested:
z.number(), skipped: z.number() })` (mesma decisão da Task 04 para `/users/bulk-activate`)
é o que faz `OpenApiSchemaBuilder` gerar um corpo de resposta tipado no spec OpenAPI
exportado por `pnpm --filter backend openapi:export` — sem isso, a resposta `200` cairia
no ramo `{ type: "object", properties: {}, additionalProperties: true }` de
`OpenApiSchemaBuilder.buildResponses` (ver
`apps/backend/src/shared/infra/openapi/openapi-schema-builder.ts`), e o tipo gerado em
`@repo/api-types` para `paths["/users/bulk-deactivate"]["patch"]["responses"][200]` não
teria os campos `updated`/`requested`/`skipped` tipados. Isso é obrigatório porque a Task
11 (`useBulkChangeUserStatus`) depende desse tipo gerado para
`UseMutationResult<{ updated: number, requested: number, skipped: number }, ...>` fazer
type-check.

Em `apps/backend/src/shared/infra/ioc/module/user/user-module.ts`, adicionar o import e o binding do controller (o binding de `USER_TYPES.UseCases.BulkChangeUserStatus` já existe desde a Task 04 — reaproveitar, não recriar):

```ts
import { BulkDeactivateUsersController } from "@/user/infra/controller/bulk-deactivate-users.controller"
```

```ts
	bind(USER_TYPES.Controllers.BulkDeactivateUsers).to(BulkDeactivateUsersController)
```

Em `apps/backend/src/bootstrap/setup-user-module.ts`, adicionar ao array `controllers` (logo após `resolve(USER_TYPES.Controllers.BulkActivateUsers)` da Task 04):

```ts
		resolve(USER_TYPES.Controllers.BulkDeactivateUsers),
```

- **Step 4: Rodar o teste para confirmar que passa**

Run: `pnpm --filter backend test:business-flow -- src/user/infra/controller/bulk-deactivate-users.business-flow-test.ts`
Expected: PASS

- **Step 5: Commit**

```bash
git add apps/backend/src/user/infra/controller/bulk-deactivate-users.controller.ts apps/backend/src/user/infra/controller/routes/user-routes.ts apps/backend/src/shared/infra/ioc/module/service-identifier/user-types.ts apps/backend/src/shared/infra/ioc/module/user/user-module.ts apps/backend/src/bootstrap/setup-user-module.ts apps/backend/src/user/infra/controller/bulk-deactivate-users.business-flow-test.ts
git commit -m "feat: adiciona rota PATCH /users/bulk-deactivate"
```

- **Step 6: Escrever os testes falhos de validação e autorização (mesma bateria da Task 04, adaptada)**

Adicionar ao mesmo arquivo de teste:

```ts
	test("Deve retornar 400 para array vazio", async () => {
		const response = await request(fastifyServer.server)
			.patch(UserRoutes.BULK_DEACTIVATE_USERS)
			.set("Authorization", `Bearer ${token}`)
			.send({ userIds: [] })

		expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
	})

	test("Deve retornar 400 para mais de 100 IDs", async () => {
		const tooManyIds = Array.from({ length: 101 }, () => randomUUID())

		const response = await request(fastifyServer.server)
			.patch(UserRoutes.BULK_DEACTIVATE_USERS)
			.set("Authorization", `Bearer ${token}`)
			.send({ userIds: tooManyIds })

		expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
	})

	test("Deve retornar 400 para UUID inválido na lista", async () => {
		const response = await request(fastifyServer.server)
			.patch(UserRoutes.BULK_DEACTIVATE_USERS)
			.set("Authorization", `Bearer ${token}`)
			.send({ userIds: ["not-a-uuid"] })

		expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
	})

	test("Deve retornar 401 quando o JWT não é fornecido", async () => {
		const response = await request(fastifyServer.server)
			.patch(UserRoutes.BULK_DEACTIVATE_USERS)
			.send({ userIds: [randomUUID()] })

		expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
	})

	test("Deve retornar 403 quando o requester não é admin (MEMBER)", async () => {
		await createAndSaveUser({
			userRepository,
			id: randomUUID(),
			email: "member@bulk-deactivate.test",
			password: "member_password",
			role: "MEMBER",
		})
		const memberResult = await authenticate.execute({
			email: "member@bulk-deactivate.test",
			password: "member_password",
		})
		const memberToken = memberResult.force.success().value.token

		const response = await request(fastifyServer.server)
			.patch(UserRoutes.BULK_DEACTIVATE_USERS)
			.set("Authorization", `Bearer ${memberToken}`)
			.send({ userIds: [randomUUID()] })

		expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
	})

	test("Deve retornar 403 (NotAllowedToManageUserError) quando o requester deixou de existir", async () => {
		const requesterFound = await userRepository.userOfEmail(
			"auth@bulk-deactivate.test",
		)
		requesterFound?.delete()
		if (requesterFound) await userRepository.update(requesterFound)

		const response = await request(fastifyServer.server)
			.patch(UserRoutes.BULK_DEACTIVATE_USERS)
			.set("Authorization", `Bearer ${token}`)
			.send({ userIds: [randomUUID()] })

		expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
		expect(response.body).toHaveProperty("message")
	})
```

- **Step 7: Rodar o arquivo de teste completo para confirmar que passa**

Run: `pnpm --filter backend test:business-flow -- src/user/infra/controller/bulk-deactivate-users.business-flow-test.ts`
Expected: PASS (7 testes)

- **Step 8: Rodar a suíte completa de backend e o type-check**

Run: `pnpm --filter backend test:run`
Expected: PASS

Run: `pnpm --filter backend tsc:check`
Expected: sem erros de tipo

- **Step 9: Commit final**

```bash
git add apps/backend/src/user/infra/controller/bulk-deactivate-users.business-flow-test.ts
git commit -m "test: cobre validação e autorização de PATCH /users/bulk-deactivate"
```

## Critérios de Sucesso

- `PATCH /users/bulk-deactivate` retorna `200` com `{ updated, requested, skipped }` para uma seleção mista de usuários elegíveis/inelegíveis (FR-007).
- A mesma instância de `BulkChangeUserStatusUseCase` registrada em `USER_TYPES.UseCases.BulkChangeUserStatus` (Task 04) é reaproveitada por este controller, apenas com `targetStatus: "suspended"` — nenhum use case duplicado (FR-012).
- A rota é protegida (`isProtected: true`, `onlyAdmin: true`) e devolve `401` sem JWT e `403` para requester `MEMBER`.
- O schema `z.array(z.string().uuid()).min(1).max(100)` rejeita com `400` array vazio, mais de 100 IDs e UUIDs inválidos.
- O controller está registrado no bootstrap (`setup-user-module.ts`) — a rota responde no servidor de teste real.
- `pnpm --filter backend test:run` e `pnpm --filter backend tsc:check` passam sem erros.
