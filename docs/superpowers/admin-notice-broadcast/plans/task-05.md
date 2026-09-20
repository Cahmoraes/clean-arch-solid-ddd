# Task 5: Endpoint POST de broadcast e tipos gerados [FR-001, FR-002, FR-003, FR-012]

**Status:** PENDING
**PRD:** `../prd/prd-admin-notice-broadcast.md`
**Spec:** `../specs/admin-notice-broadcast-design.md`
**Tier:** capable
**Depends on:** task-04

## Visão Geral

Expõe `POST /api/v1/notifications/broadcast` (`isProtected: true`, `onlyAdmin: true`) por meio do `BroadcastNoticeController`, que valida o corpo `{ title, message }`, delega ao `BroadcastNoticeUseCase` e responde `201 { recipients }` (400 para corpo inválido). Inclui a composição: identificadores restantes no `NOTIFICATION_TYPES`, bindings em `notification-module.ts`, seleção do provider de destinatários por ambiente (padrão de `NotificationRepositoryProvider`) e inclusão do controller em `setup-notification-module.ts`. O último passo roda `pnpm generate:types` na raiz para que o frontend receba a rota e o valor `NOTICE` em `@repo/api-types`. Atenção para o gate do wave: após gerar os tipos, `NOTIFICATION_TYPE_STYLE` do frontend (mapa `Record` exaustivo) só compila depois da task 7; o `tsc:check` do frontend fica vermelho até lá e é fechado na barreira da wave 4.

Sem rate limit por rota neste endpoint: limite de frequência de envios está fora de escopo no PRD.

## Arquivos

- Create: `apps/backend/src/notification/infra/controller/broadcast-notice.controller.ts`
- Create: `apps/backend/src/notification/infra/provider/active-recipients-provider-resolver.ts`
- Modify: `apps/backend/src/notification/infra/controller/routes/notification-routes.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/service-identifier/notification-types.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/notification/notification-module.ts`
- Modify: `apps/backend/src/bootstrap/setup-notification-module.ts`
- Modify (gerado): `packages/api-types/index.d.ts`
- Test: `apps/backend/src/notification/infra/controller/broadcast-notice.controller.business-flow-test.ts`

### Conformidade com as Skills Padrão

- `no-workarounds`: o 400 para aviso em branco vem do mapeamento explícito de `InvalidNoticeError` no controller, não de um `try/catch` genérico; os tipos do frontend vêm do gerador oficial, sem `extended-paths.ts` manual.
- `test-antipatterns`: business-flow com servidor real (`serverBuildForTest`), repositório e provider in-memory reais e autenticação por JWT real; nenhum mock do use case.

## Passos

- **Step 1: Confirmar lacunas antes de escrever código**

Run: `grep -n "CREATED" apps/backend/src/shared/infra/controller/factory/response-factory.ts apps/backend/src/shared/infra/server/http-status.ts`
Expected: `ResponseFactory.CREATED(input)` e `HTTP_STATUS.CREATED` existem (usados neste passo 4). Se `CREATED` estiver ausente, criá-lo no padrão dos demais helpers do arquivo (`create({ status: HTTP_STATUS.CREATED, ...input })`) antes de seguir.

Run: `grep -rln "serverBuildForTest" apps/backend/src/notification`
Expected: lista dos business-flows de notificação existentes (`get-notifications.controller.business-flow-test.ts`, `notification-stream.controller.business-flow-test.ts`, entre outros); serão reexecutados no passo 10.

- **Step 2: Write the failing test**

```ts
// apps/backend/src/notification/infra/controller/broadcast-notice.controller.business-flow-test.ts
import { randomUUID } from "node:crypto"
import request from "supertest"
import { createAndSaveUser } from "test/factory/create-and-save-user"
import { serverBuildForTest } from "test/factory/server-build-for-test"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { InMemoryActiveRecipientsProvider } from "@/notification/infra/provider/in-memory/in-memory-active-recipients.provider.js"
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

describe("POST /api/v1/notifications/broadcast", () => {
	let fastifyServer: FastifyAdapter
	let notificationRepository: InMemoryNotificationRepository
	let activeRecipients: InMemoryActiveRecipientsProvider
	let authenticate: AuthenticateUseCase
	let adminId: string
	let memberId: string
	let adminToken: string
	let memberToken: string

	async function login(email: string): Promise<string> {
		const result = await authenticate.execute({
			email,
			password: "any_password",
		})
		return result.force.success().value.token
	}

	beforeEach(async () => {
		container.snapshot()
		notificationRepository = new InMemoryNotificationRepository()
		activeRecipients = new InMemoryActiveRecipientsProvider()
		container
			.rebind(NOTIFICATION_TYPES.Repositories.Notification)
			.toConstantValue(notificationRepository)
		container
			.rebind(NOTIFICATION_TYPES.Providers.ActiveRecipients)
			.toConstantValue(activeRecipients)
		container
			.rebind(NOTIFICATION_TYPES.Infra.NotificationBroadcastSubscriber)
			.toConstantValue({
				start: vi.fn().mockResolvedValue(undefined),
				stop: vi.fn().mockResolvedValue(undefined),
			})
		container
			.rebind(NOTIFICATION_TYPES.Infra.NotificationQueueWorker)
			.toConstantValue({ init: vi.fn().mockResolvedValue(undefined) })
		container
			.rebind(NOTIFICATION_TYPES.EventHandlers.CreateNotificationOnCheckIn)
			.toConstantValue({ subscribe: vi.fn() })
		authenticate = container.get<AuthenticateUseCase>(
			AUTH_TYPES.UseCases.Authenticate,
		)
		fastifyServer = await serverBuildForTest()
		await fastifyServer.ready()
		adminId = randomUUID()
		memberId = randomUUID()
		const userRepository = container.get(USER_TYPES.Repositories.User)
		await createAndSaveUser({
			userRepository,
			id: adminId,
			email: "admin.notice@test.com",
			password: "any_password",
			role: "ADMIN",
		})
		await createAndSaveUser({
			userRepository,
			id: memberId,
			email: "member.notice@test.com",
			password: "any_password",
			role: "MEMBER",
		})
		activeRecipients.userIds = [adminId, memberId]
		adminToken = await login("admin.notice@test.com")
		memberToken = await login("member.notice@test.com")
	})

	afterEach(async () => {
		container.restore()
		await fastifyServer.close()
	})

	function broadcast(body: object) {
		return request(fastifyServer.server)
			.post(NotificationRoutes.BROADCAST)
			.set("Authorization", `Bearer ${adminToken}`)
			.send(body)
	}

	test("ADMIN envia o aviso e recebe 201 com o numero de destinatarios", async () => {
		const response = await broadcast({
			title: "Manutencao programada",
			message: "O sistema ficara fora do ar as 22h.",
		})

		expect(response.status).toBe(HTTP_STATUS.CREATED)
		expect(response.body).toEqual({ recipients: 2 })
		expect(notificationRepository.notifications.size).toBe(2)
	})

	test("um segundo usuario ve o aviso em GET /api/v1/notifications", async () => {
		await broadcast({
			title: "Manutencao programada",
			message: "O sistema ficara fora do ar as 22h.",
		})

		const response = await request(fastifyServer.server)
			.get(NotificationRoutes.LIST)
			.set("Authorization", `Bearer ${memberToken}`)

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body.total).toBe(1)
		expect(response.body.notifications[0]).toMatchObject({
			type: "NOTICE",
			title: "Manutencao programada",
			message: "O sistema ficara fora do ar as 22h.",
			gymName: null,
			reason: null,
			readAt: null,
		})
	})

	test("o proprio administrador remetente tambem recebe o aviso", async () => {
		await broadcast({ title: "Aviso", message: "Mensagem" })

		const response = await request(fastifyServer.server)
			.get(NotificationRoutes.LIST)
			.set("Authorization", `Bearer ${adminToken}`)

		expect(response.body.total).toBe(1)
		expect(response.body.notifications[0].type).toBe("NOTICE")
	})

	test.each([
		["titulo vazio", { title: "", message: "Mensagem" }],
		["mensagem vazia", { title: "Aviso", message: "" }],
		["titulo acima de 100 caracteres", { title: "a".repeat(101), message: "Mensagem" }],
		["mensagem acima de 500 caracteres", { title: "Aviso", message: "a".repeat(501) }],
		["corpo sem mensagem", { title: "Aviso" }],
		["corpo vazio", {}],
	])("retorna 400 e nao cria aviso para %s", async (_, body) => {
		const response = await broadcast(body)

		expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
		expect(notificationRepository.notifications.size).toBe(0)
	})

	test("aceita titulo com 100 e mensagem com 500 caracteres", async () => {
		const response = await broadcast({
			title: "a".repeat(100),
			message: "b".repeat(500),
		})

		expect(response.status).toBe(HTTP_STATUS.CREATED)
	})
})
```

- **Step 3: Run test to verify it fails**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.business-flow.ts src/notification/infra/controller/broadcast-notice.controller.business-flow-test.ts`
Expected: FAIL - `NotificationRoutes.BROADCAST` é `undefined` e `Providers.ActiveRecipients` ainda não tem binding (o `container.rebind` do `beforeEach` falha).

- **Step 4: Write minimal implementation**

4a. Rota:

```ts
// apps/backend/src/notification/infra/controller/routes/notification-routes.ts
export const NotificationRoutes = {
	LIST: "/api/v1/notifications",
	UNREAD_COUNT: "/api/v1/notifications/unread-count",
	MARK_AS_READ: "/api/v1/notifications/:id/read",
	MARK_ALL_AS_READ: "/api/v1/notifications/read-all",
	STREAM: "/api/v1/notifications/stream",
	BROADCAST: "/api/v1/notifications/broadcast",
} as const
```

4b. Identificador do controller (os de `Providers.ActiveRecipients` e `UseCases.BroadcastNotice` vieram da task 4):

```ts
// notification-types.ts, dentro de Controllers
		BroadcastNotice: Symbol.for("BroadcastNoticeController"),
```

4c. Seleção do provider por ambiente (mesmo padrão de `NotificationRepositoryProvider`):

```ts
// apps/backend/src/notification/infra/provider/active-recipients-provider-resolver.ts
import type { ResolutionContext } from "inversify"
import type { ActiveRecipientsProvider } from "@/notification/application/provider/active-recipients.provider.js"
import { InMemoryActiveRecipientsProvider } from "@/notification/infra/provider/in-memory/in-memory-active-recipients.provider.js"
import { PrismaActiveRecipientsProvider } from "@/notification/infra/provider/prisma/prisma-active-recipients.provider.js"
import { env, isProduction } from "@/shared/infra/env/index.js"

export class ActiveRecipientsProviderResolver {
	public static provide(context: ResolutionContext): ActiveRecipientsProvider {
		if (!isProduction()) {
			return context.get(InMemoryActiveRecipientsProvider, { autobind: true })
		}
		if (env.DATABASE_PROVIDER === "prisma") {
			return context.get(PrismaActiveRecipientsProvider, { autobind: true })
		}
		return context.get(InMemoryActiveRecipientsProvider, { autobind: true })
	}
}
```

4d. Controller (versão mínima; o mapeamento de `InvalidNoticeError` para 400 entra no passo 8, guiado por teste):

```ts
// apps/backend/src/notification/infra/controller/broadcast-notice.controller.ts
import type { FastifyRequest } from "fastify"
import { inject, injectable } from "inversify"
import { z } from "zod"
import {
	type BroadcastNoticeUseCase,
	NOTICE_MESSAGE_MAX,
	NOTICE_TITLE_MAX,
} from "@/notification/application/use-case/broadcast-notice.usecase.js"
import { BaseController } from "@/shared/infra/controller/base-controller.js"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory.js"
import { Logger } from "@/shared/infra/decorator/logger.js"
import { NOTIFICATION_TYPES, SHARED_TYPES } from "@/shared/infra/ioc/types.js"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type { HttpServer, Schema } from "@/shared/infra/server/http-server.js"
import { NotificationRoutes } from "./routes/notification-routes.js"

const broadcastNoticeBodySchema = z.object({
	title: z.string().min(1).max(NOTICE_TITLE_MAX).meta({
		description: "Notice title (1 to 100 characters)",
		example: "Manutenção programada",
	}),
	message: z.string().min(1).max(NOTICE_MESSAGE_MAX).meta({
		description: "Notice message (1 to 500 characters)",
		example: "O sistema ficará fora do ar hoje às 22h.",
	}),
})

const broadcastNoticeResponseSchema = z.object({
	recipients: z.number().int().min(0).meta({
		description: "Number of active users that received the notice",
		example: 42,
	}),
})

const errorResponseSchema = z.object({
	message: z.string().meta({ description: "Error message" }),
})

@injectable()
export class BroadcastNoticeController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly httpServer: HttpServer,
		@inject(NOTIFICATION_TYPES.UseCases.BroadcastNotice)
		private readonly broadcastNotice: BroadcastNoticeUseCase,
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
			"post",
			NotificationRoutes.BROADCAST,
			{
				callback: this.callback,
				isProtected: true,
				onlyAdmin: true,
			},
			makeBroadcastNoticeSwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest) {
		const parsedBody = this.parseRequest(broadcastNoticeBodySchema, req.body)
		if (parsedBody.isFailure()) {
			return this.createResponseError(parsedBody)
		}
		const result = await this.broadcastNotice.execute(parsedBody.value)
		if (result.isFailure()) {
			return this.createResponseError(result)
		}
		return ResponseFactory.CREATED({
			body: { recipients: result.value.recipients },
		})
	}
}

function makeBroadcastNoticeSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["notifications"],
		summary: "Broadcast a notice",
		description:
			"Sends a notice as an in-app notification to every active user. Requires admin authentication.",
		security: true,
		body: broadcastNoticeBodySchema,
		responses: {
			201: {
				description: "Notice sent successfully",
				schema: broadcastNoticeResponseSchema,
			},
			400: { description: "Invalid notice", schema: errorResponseSchema },
			401: { description: "Unauthorized" },
			403: { description: "Forbidden" },
		},
	})
}
```

4e. Bindings:

```ts
// notification-module.ts: novos imports
import { BroadcastNoticeUseCase } from "@/notification/application/use-case/broadcast-notice.usecase"
import { BroadcastNoticeController } from "@/notification/infra/controller/broadcast-notice.controller.js"
import { ActiveRecipientsProviderResolver } from "@/notification/infra/provider/active-recipients-provider-resolver"

// dentro de new ContainerModule(({ bind }) => { ... })
	bind(NOTIFICATION_TYPES.Providers.ActiveRecipients)
		.toDynamicValue(ActiveRecipientsProviderResolver.provide)
		.inSingletonScope()
	bind(NOTIFICATION_TYPES.UseCases.BroadcastNotice).to(BroadcastNoticeUseCase)
	bind(NOTIFICATION_TYPES.Controllers.BroadcastNotice)
		.to(BroadcastNoticeController)
		.inSingletonScope()
```

4f. Bootstrap:

```ts
// setup-notification-module.ts: novo import
import type { BroadcastNoticeController } from "@/notification/infra/controller/broadcast-notice.controller.js"

// no array controllers, depois de NotificationStream
			resolve<BroadcastNoticeController>(
				NOTIFICATION_TYPES.Controllers.BroadcastNotice,
			),
```

- **Step 5: Run test to verify it passes**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.business-flow.ts src/notification/infra/controller/broadcast-notice.controller.business-flow-test.ts`
Expected: PASS (todos os casos do passo 2).

- **Step 6: Review Focus: Título ou mensagem só com espaços em branco → recusado com 400, nunca cria aviso vazio. Write the failing test**

Review Focus: Título ou mensagem só com espaços em branco → recusado com 400, nunca cria aviso vazio

Adicionar ao `describe` (o spec só nomeou os limites 1-100 / 1-500; a entrada só de espaços é o caso implícito):

```ts
	test.each([
		["titulo so com espacos", { title: "     ", message: "Mensagem valida" }],
		["mensagem so com espacos", { title: "Titulo valido", message: "     " }],
		["titulo e mensagem so com espacos", { title: "   ", message: "   " }],
		["titulo com tabs e quebras de linha", { title: "\t\n ", message: "Mensagem valida" }],
	])("Review Focus: %s retorna 400 e nunca cria aviso vazio", async (_, body) => {
		const response = await broadcast(body)

		expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
		expect(notificationRepository.notifications.size).toBe(0)
	})
```

- **Step 7: Run test to verify it fails**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.business-flow.ts src/notification/infra/controller/broadcast-notice.controller.business-flow-test.ts -t "Review Focus"`
Expected: FAIL - `AssertionError: expected 422 to be 400`: o zod do passo 4 aceita `"     "` (comprimento 5), o use case recusa com `InvalidNoticeError` (`kind: "validation"`) e o `BaseController` mapeia esse kind para 422.

- **Step 8: Mapear InvalidNoticeError para 400 no controller**

```ts
// broadcast-notice.controller.ts: novos imports
import { InvalidNoticeError } from "@/notification/domain/errors/invalid-notice-error.js"
import type {
	HandleCallbackResponse,
	HttpServer,
	Schema,
} from "@/shared/infra/server/http-server.js"

// dentro da classe BroadcastNoticeController
	protected mapResponseError(
		error: Error | Error[],
	): HandleCallbackResponse | undefined {
		if (error instanceof InvalidNoticeError) {
			return ResponseFactory.BAD_REQUEST({ message: error.message })
		}
		return undefined
	}
```

(Substituir o `import type { HttpServer, Schema }` anterior pelo import combinado acima.)

- **Step 9: Run test to verify it passes**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.business-flow.ts src/notification/infra/controller/broadcast-notice.controller.business-flow-test.ts`
Expected: PASS (arquivo inteiro, incluindo os quatro casos "Review Focus").

- **Step 10: Confirmar que os business-flows de notificação existentes seguem verdes**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.business-flow.ts src/notification/infra/controller/get-notifications.controller.business-flow-test.ts`
Expected: PASS. Repetir para `src/notification/infra/controller/notification-stream.controller.business-flow-test.ts` (um arquivo por execução). Se algum falhar por resolução do novo `Providers.ActiveRecipients`, adicionar o rebind com `InMemoryActiveRecipientsProvider` ao `beforeEach` desse teste, no mesmo formato do passo 2.

- **Step 11: Gerar os tipos do frontend**

Run: `pnpm generate:types`
Expected: conclui sem erro e regrava `packages/api-types/index.d.ts`.

Run: `grep -n "notifications/broadcast\|\"NOTICE\"" packages/api-types/index.d.ts`
Expected: pelo menos uma linha com `"/api/v1/notifications/broadcast"` e uma com `"NOTICE"` (no enum de `type` das notificações). Se faltar, corrigir o schema OpenAPI do controller (não editar o arquivo gerado à mão).

- **Step 12: Commit** *(sequential execution only; em wave paralela o orquestrador comita na barreira e você apenas reporta os arquivos)*

```bash
git add apps/backend/src/notification apps/backend/src/shared/infra/ioc/module apps/backend/src/bootstrap/setup-notification-module.ts packages/api-types/index.d.ts
git commit -m "feat(notification): adiciona endpoint de broadcast de aviso e tipos gerados"
```

## Critérios de Sucesso

- `POST /api/v1/notifications/broadcast` com ADMIN e corpo válido responde 201 com `{ recipients }` e cria uma notificação `NOTICE` por usuário ativo (FR-001).
- Título e mensagem fora de 1-100 / 1-500 respondem 400 (FR-002); só espaços em branco também respondem 400 e nunca criam aviso.
- Um segundo usuário vê o aviso em `GET /api/v1/notifications` com `type: "NOTICE"`, e o administrador remetente também recebe (FR-003, FR-012).
- `packages/api-types/index.d.ts` contém `/api/v1/notifications/broadcast` e `"NOTICE"`.
