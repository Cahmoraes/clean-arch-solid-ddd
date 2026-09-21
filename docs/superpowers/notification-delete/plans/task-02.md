# Task 2: Endpoint DELETE, IoC, OpenAPI e business-flow [FR-005, FR-006]

**Status:** PENDING
**PRD:** `../prd/prd-notification-delete.md`
**Spec:** `../specs/notification-delete-design.md`
**Tier:** standard
**Depends on:** task-01

## Visão Geral

Expõe `DELETE /api/v1/notifications/:id` (protegido, resposta 204) sobre o `DeleteNotificationUseCase` da task-01: rota, símbolos do IoC, bind no módulo, registro do controller no bootstrap e o controller com o OpenAPI (204, 400, 401, 404). Cobre com testes business-flow HTTP (204 e a notificação some da listagem, 401 sem token, 404 para notificação de outro usuário sem alterá-la, 404 na segunda exclusão, 400 para id inválido). No fim regenera o contrato compartilhado para o `@repo/api-types` expor o `DELETE`, que a task-03 usa.

## Arquivos

- Modify: `apps/backend/src/notification/infra/controller/routes/notification-routes.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/service-identifier/notification-types.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/notification/notification-module.ts`
- Modify: `apps/backend/src/bootstrap/setup-notification-module.ts`
- Create: `apps/backend/src/notification/infra/controller/delete-notification.controller.ts`
- Test: `apps/backend/src/notification/infra/controller/delete-notification.controller.business-flow-test.ts` (novo)
- Gerado (gitignored, não commitar): `apps/backend/docs/openapi-spec.json` e `packages/api-types/index.d.ts`

## Interfaces

- **Consome:** da task-01, `DeleteNotificationUseCase.execute(input: DeleteNotificationInput): Promise<DeleteNotificationResponse>` com `DeleteNotificationInput = { notificationId: string; userId: string }` e `DeleteNotificationResponse = Either<NotificationNotFoundError, void>`, exportados de `@/notification/application/use-case/delete-notification.usecase.js`; e `Notification.softDelete(): void`.
- **Produz:**
  - `NotificationRoutes.DELETE = "/api/v1/notifications/:id"`.
  - `NOTIFICATION_TYPES.UseCases.DeleteNotification` e `NOTIFICATION_TYPES.Controllers.DeleteNotification`.
  - `DeleteNotificationController` (`@injectable()`, `extends BaseController`, `init(): Promise<void>` registra `"delete"` protegida).
  - Contrato gerado: rota `DELETE /api/v1/notifications/{id}` em `paths["/api/v1/notifications/{id}"]["delete"]` do `@repo/api-types` (204 sem corpo, 400, 401, 404), com `params.path.id: string`.

### Conformidade com as Skills Padrão

- `no-workarounds`: sem supressões nem type assertions; a resposta 404 vem do `NotificationNotFoundError` via `createResponseError`
- `test-antipatterns`: business-flow com o repositório em memória real, mockando só a infraestrutura externa (broadcast subscriber, queue worker, handler de check-in) como os testes vizinhos
- `typescript-advanced`: tipos do `Either` no controller e do `Schema` do OpenAPI

## Passos

- **Step 1: Confirmar o setup e os helpers antes de escrever o teste**

Abra `apps/backend/src/notification/infra/controller/get-notifications.controller.business-flow-test.ts` e confirme que o `beforeEach`/`afterEach` do bloco `describe("Notification REST controllers")` tem o mesmo formato do teste abaixo (`container.snapshot()`, rebind de `NOTIFICATION_TYPES.Repositories.Notification` e dos três mocks de infraestrutura, `serverBuildForTest()`, `createAndSaveUser`, `AuthenticateUseCase`, `container.restore()` e `fastifyServer.close()`). Confirme também que `HTTP_STATUS` (em `@/shared/infra/server/http-status.js`) tem `NO_CONTENT`, `UNAUTHORIZED`, `NOT_FOUND` e `BAD_REQUEST`. Se algum detalhe divergir, o teste abaixo deve seguir o arquivo existente.

Run: `grep -n "NO_CONTENT\|UNAUTHORIZED\|NOT_FOUND\|BAD_REQUEST" apps/backend/src/shared/infra/server/http-status.ts`
Expected: quatro linhas, uma para cada chave.

- **Step 2: Write the failing test**

Crie `apps/backend/src/notification/infra/controller/delete-notification.controller.business-flow-test.ts`:

```ts
import { randomUUID } from "node:crypto"
import request from "supertest"
import { createAndSaveUser } from "test/factory/create-and-save-user"
import { serverBuildForTest } from "test/factory/server-build-for-test"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { Notification } from "@/notification/domain/notification.js"
import { InMemoryNotificationRepository } from "@/notification/infra/repository/in-memory/in-memory-notification.repository.js"
import type { AuthenticateUseCase } from "@/session/application/use-case/authenticate.usecase.js"
import { container } from "@/shared/infra/ioc/container.js"
import {
	AUTH_TYPES,
	NOTIFICATION_TYPES,
	USER_TYPES,
} from "@/shared/infra/ioc/types.js"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter.js"
import { HTTP_STATUS } from "@/shared/infra/server/http-status.js"
import { NotificationRoutes } from "./routes/notification-routes.js"

describe("DeleteNotificationController", () => {
	let fastifyServer: FastifyAdapter
	let notificationRepository: InMemoryNotificationRepository
	let authenticate: AuthenticateUseCase
	let token: string
	let authenticatedUserId: string

	beforeEach(async () => {
		container.snapshot()
		notificationRepository = new InMemoryNotificationRepository()
		container
			.rebind(NOTIFICATION_TYPES.Repositories.Notification)
			.toConstantValue(notificationRepository)
		container
			.rebind(NOTIFICATION_TYPES.Infra.NotificationBroadcastSubscriber)
			.toConstantValue({
				start: vi.fn().mockResolvedValue(undefined),
				stop: vi.fn().mockResolvedValue(undefined),
			})
		container
			.rebind(NOTIFICATION_TYPES.Infra.NotificationQueueWorker)
			.toConstantValue({
				init: vi.fn().mockResolvedValue(undefined),
			})
		container
			.rebind(NOTIFICATION_TYPES.EventHandlers.CreateNotificationOnCheckIn)
			.toConstantValue({
				subscribe: vi.fn(),
			})
		authenticate = container.get<AuthenticateUseCase>(
			AUTH_TYPES.UseCases.Authenticate,
		)
		fastifyServer = await serverBuildForTest()
		await fastifyServer.ready()
		authenticatedUserId = randomUUID()
		await createAndSaveUser({
			userRepository: container.get(USER_TYPES.Repositories.User),
			id: authenticatedUserId,
			email: "notification.delete.user@test.com",
			password: "any_password",
		})
		const authResult = await authenticate.execute({
			email: "notification.delete.user@test.com",
			password: "any_password",
		})
		token = authResult.force.success().value.token
	})

	afterEach(async () => {
		container.restore()
		await fastifyServer.close()
	})

	async function createNotification(userId: string): Promise<Notification> {
		const notification = Notification.create({
			id: randomUUID(),
			userId,
			type: "CHECK_IN_APPROVED",
			title: "Check-in aprovado",
			message: "Seu check-in foi aprovado com sucesso.",
		})
		await notificationRepository.save(notification)
		return notification
	}

	test("Deve excluir a notificação com 204 e ela deixa de aparecer na listagem, com o registro preservado [FR-005]", async () => {
		const notification = await createNotification(authenticatedUserId)

		const response = await request(fastifyServer.server)
			.delete(toDeletePath(notification.id))
			.set("Authorization", `Bearer ${token}`)

		expect(response.status).toBe(HTTP_STATUS.NO_CONTENT)
		const listResponse = await request(fastifyServer.server)
			.get(NotificationRoutes.LIST)
			.set("Authorization", `Bearer ${token}`)
		expect(listResponse.status).toBe(HTTP_STATUS.OK)
		expect(listResponse.body.total).toBe(0)
		expect(listResponse.body.notifications).toEqual([])
		const stored = await notificationRepository.findById(notification.id)
		expect(stored?.isDeleted).toBe(true)
	})

	test("Deve rejeitar com 401 quando a requisição não tem token [FR-006]", async () => {
		const notification = await createNotification(authenticatedUserId)

		const response = await request(fastifyServer.server).delete(
			toDeletePath(notification.id),
		)

		expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
		const stored = await notificationRepository.findById(notification.id)
		expect(stored?.isDeleted).toBe(false)
	})

	test("Deve responder 404 para notificação de outro usuário e manter a notificação na caixa do dono [FR-006]", async () => {
		const ownerId = randomUUID()
		const notification = await createNotification(ownerId)

		const response = await request(fastifyServer.server)
			.delete(toDeletePath(notification.id))
			.set("Authorization", `Bearer ${token}`)

		expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
		expect(response.body).toEqual({ message: "Notification not found" })
		const stored = await notificationRepository.findById(notification.id)
		expect(stored?.isDeleted).toBe(false)
		const ownerList = await notificationRepository.findManyByUserId({
			userId: ownerId,
			page: 1,
		})
		expect(ownerList.items).toHaveLength(1)
	})

	test("Deve responder 404, nunca 204, na segunda exclusão da mesma notificação [FR-006]", async () => {
		const notification = await createNotification(authenticatedUserId)
		const first = await request(fastifyServer.server)
			.delete(toDeletePath(notification.id))
			.set("Authorization", `Bearer ${token}`)
		expect(first.status).toBe(HTTP_STATUS.NO_CONTENT)

		const second = await request(fastifyServer.server)
			.delete(toDeletePath(notification.id))
			.set("Authorization", `Bearer ${token}`)

		expect(second.status).toBe(HTTP_STATUS.NOT_FOUND)
		expect(second.body).toEqual({ message: "Notification not found" })
	})

	test("Deve responder 400 quando o id não é um UUID [FR-006]", async () => {
		const response = await request(fastifyServer.server)
			.delete(toDeletePath("not-a-uuid"))
			.set("Authorization", `Bearer ${token}`)

		expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
	})
})

function toDeletePath(id: string): string {
	return NotificationRoutes.DELETE.replace(":id", id)
}
```

- **Step 3: Run test to verify it fails**

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.business-flow.ts src/notification/infra/controller/delete-notification.controller.business-flow-test.ts`
Expected: FAIL. `NotificationRoutes.DELETE` não existe, então `toDeletePath` lança `TypeError: Cannot read properties of undefined (reading 'replace')` em todos os 5 testes (e o arquivo também falha no typecheck do editor, que o runner não executa).

- **Step 4: Write minimal implementation (rota, símbolos do IoC, bind, bootstrap)**

Em `apps/backend/src/notification/infra/controller/routes/notification-routes.ts`, adicione a chave logo após `MARK_AS_READ`:

```ts
	DELETE: "/api/v1/notifications/:id",
```

Em `apps/backend/src/shared/infra/ioc/module/service-identifier/notification-types.ts`, em `UseCases` (após `MarkAllAsRead`) e em `Controllers` (após `MarkAllAsRead`):

```ts
		DeleteNotification: Symbol.for("DeleteNotificationUseCase"),
```

```ts
		DeleteNotification: Symbol.for("DeleteNotificationController"),
```

Em `apps/backend/src/shared/infra/ioc/module/notification/notification-module.ts`, acrescente os imports (seguindo o estilo dos vizinhos: use case sem `.js`, controller com `.js`) e os binds:

```ts
import { DeleteNotificationUseCase } from "@/notification/application/use-case/delete-notification.usecase"
import { DeleteNotificationController } from "@/notification/infra/controller/delete-notification.controller.js"
```

```ts
	bind(NOTIFICATION_TYPES.UseCases.DeleteNotification).to(
		DeleteNotificationUseCase,
	)
```

```ts
	bind(NOTIFICATION_TYPES.Controllers.DeleteNotification)
		.to(DeleteNotificationController)
		.inSingletonScope()
```

Em `apps/backend/src/bootstrap/setup-notification-module.ts`, acrescente o import de tipo e a entrada no array `controllers` (logo após o `MarkAllAsRead`):

```ts
import type { DeleteNotificationController } from "@/notification/infra/controller/delete-notification.controller.js"
```

```ts
			resolve<DeleteNotificationController>(
				NOTIFICATION_TYPES.Controllers.DeleteNotification,
			),
```

- **Step 5: Write minimal implementation (controller)**

Crie `apps/backend/src/notification/infra/controller/delete-notification.controller.ts` (imports copiados de `mark-as-read.controller.ts`; referência de resposta 204: `apps/backend/src/user/infra/controller/delete-user.controller.ts`):

```ts
import type { FastifyRequest } from "fastify"
import { inject, injectable } from "inversify"
import { z } from "zod"
import type { DeleteNotificationUseCase } from "@/notification/application/use-case/delete-notification.usecase.js"
import { BaseController } from "@/shared/infra/controller/base-controller.js"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory.js"
import { Logger } from "@/shared/infra/decorator/logger.js"
import { NOTIFICATION_TYPES, SHARED_TYPES } from "@/shared/infra/ioc/types.js"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type { HttpServer, Schema } from "@/shared/infra/server/http-server.js"
import { NotificationRoutes } from "./routes/notification-routes.js"

const deleteNotificationParamsSchema = z.object({
	id: z.uuid().meta({
		description: "Notification ID",
		example: "550e8400-e29b-41d4-a716-446655440000",
	}),
})

const errorResponseSchema = z.object({
	message: z.string().meta({ description: "Error message" }),
})

@injectable()
export class DeleteNotificationController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly httpServer: HttpServer,
		@inject(NOTIFICATION_TYPES.UseCases.DeleteNotification)
		private readonly deleteNotification: DeleteNotificationUseCase,
	) {
		super()
		this.bindMethods()
	}

	private bindMethods() {
		this.callback = this.callback.bind(this)
	}

	@Logger({ message: "✅" })
	public async init(): Promise<void> {
		this.httpServer.register(
			"delete",
			NotificationRoutes.DELETE,
			{
				callback: this.callback,
				isProtected: true,
			},
			makeDeleteNotificationSwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest) {
		const parsedParams = this.parseRequest(
			deleteNotificationParamsSchema,
			req.params,
		)
		if (parsedParams.isFailure()) {
			return this.createResponseError(parsedParams)
		}
		const result = await this.deleteNotification.execute({
			notificationId: parsedParams.value.id,
			userId: req.user.sub.id,
		})
		if (result.isFailure()) {
			return this.createResponseError(result)
		}
		return ResponseFactory.NO_CONTENT()
	}
}

function makeDeleteNotificationSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["notifications"],
		summary: "Delete notification",
		description:
			"Soft-deletes a notification of the authenticated user. Responds 404 when it does not exist, belongs to another user or was already deleted.",
		security: true,
		params: deleteNotificationParamsSchema,
		responses: {
			204: { description: "Notification deleted successfully" },
			400: {
				description: "Invalid params",
				schema: errorResponseSchema,
			},
			401: { description: "Unauthorized" },
			404: {
				description: "Notification not found",
				schema: errorResponseSchema,
			},
		},
	})
}
```

- **Step 6: Run test to verify it passes**

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.business-flow.ts src/notification/infra/controller/delete-notification.controller.business-flow-test.ts`
Expected: PASS (5 testes).

- **Step 7: Regenerar o contrato compartilhado e confirmar o `DELETE`**

Run: `pnpm generate:types` (na raiz do repositório; roda `openapi:export` do backend e a geração de `packages/api-types/index.d.ts`)
Expected: o comando termina sem erro.

Run: `grep -n '"/api/v1/notifications/{id}"' packages/api-types/index.d.ts` e depois `grep -n "delete: operations\|delete?: never" packages/api-types/index.d.ts | head`
Expected: a primeira mostra o path `"/api/v1/notifications/{id}"`; o bloco desse path contém `delete:` apontando para uma operação (não `delete?: never`). Se o path não aparecer, o controller não foi registrado: revise os Steps 4 e 5 antes de seguir. A task-03 depende desse path.

- **Step 8: Confirmar que os artefatos gerados são ignorados pelo git**

Run: `git check-ignore apps/backend/docs/openapi-spec.json packages/api-types/index.d.ts`
Expected: imprime os dois caminhos (ambos ignorados; portanto não entram no commit). Se `openapi-spec.json` NÃO for impresso, ele é versionado: inclua-o no `git add` do passo seguinte.

- **Step 9: Commit** *(somente quando `workflow.auto_commit` for true; caso contrário pule este passo e reporte os arquivos)*

```bash
git add apps/backend/src/notification/infra/controller/routes/notification-routes.ts apps/backend/src/shared/infra/ioc/module/service-identifier/notification-types.ts apps/backend/src/shared/infra/ioc/module/notification/notification-module.ts apps/backend/src/bootstrap/setup-notification-module.ts apps/backend/src/notification/infra/controller/delete-notification.controller.ts apps/backend/src/notification/infra/controller/delete-notification.controller.business-flow-test.ts
git commit -m "feat(notification-delete): adiciona endpoint DELETE /notifications/:id" -m "Claude-Session: https://claude.ai/code/session_01PgFG13SHLTeWfds7Pinf2j"
```

## Critérios de Sucesso

- `DELETE /api/v1/notifications/:id` autenticado responde 204 e a notificação deixa de aparecer em `GET /api/v1/notifications`, com o registro preservado [FR-005].
- Sem token responde 401; notificação de outro usuário, inexistente ou já excluída responde 404 com `{ message: "Notification not found" }`, sem alterar a caixa do dono; id inválido responde 400 [FR-006].
- O contrato gerado do `@repo/api-types` expõe `paths["/api/v1/notifications/{id}"]["delete"]` com 204, 400, 401 e 404.
