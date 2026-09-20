# Task 6: Autorização do endpoint de broadcast [FR-016]

**Status:** DONE
**Verified:** `pnpm --filter backend exec vitest --run --config ./test/vite.config.business-flow.ts src/notification/infra/controller/broadcast-notice.authorization.business-flow-test.ts` → exit 0
**PRD:** `../prd/prd-admin-notice-broadcast.md`
**Spec:** `../specs/admin-notice-broadcast-design.md`
**Tier:** standard
**Depends on:** task-05

## Visão Geral

Superfície crítica (a ação atinge todos os usuários e é irreversível), por isso tem task própria: business-flow dedicado que prova 401 sem token, 401 com token inválido, 403 para `MEMBER` e 201 para `ADMIN`, e que nenhuma notificação é criada nos casos 401/403. Como a implementação (`isProtected` e `onlyAdmin`) já existe desde a task 5, os testes nascem verdes; para provar que eles realmente detectam regressão, a task inclui uma verificação de sensibilidade que remove temporariamente cada trava e confirma que o teste correspondente falha. Se algum teste falhar sem manipulação, corrigir a configuração do controller na raiz (sem gambiarra).

## Arquivos

- Test: `apps/backend/src/notification/infra/controller/broadcast-notice.authorization.business-flow-test.ts`
- Modify (apenas se algum teste falhar sem manipulação): `apps/backend/src/notification/infra/controller/broadcast-notice.controller.ts`

### Conformidade com as Skills Padrão

- `no-workarounds`: falha de autorização é corrigida na configuração `isProtected`/`onlyAdmin` do controller, nunca com checagem de papel duplicada dentro do use case ou do teste.
- `test-antipatterns`: JWT real emitido pelo `AuthenticateUseCase`, sem mock de guard nem de token; a asserção "nada foi criado" olha o repositório real.

## Passos

- **Step 1: Write the test**

```ts
// apps/backend/src/notification/infra/controller/broadcast-notice.authorization.business-flow-test.ts
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

const VALID_NOTICE = {
	title: "Manutencao programada",
	message: "O sistema ficara fora do ar as 22h.",
}

describe("Autorizacao de POST /api/v1/notifications/broadcast", () => {
	let fastifyServer: FastifyAdapter
	let notificationRepository: InMemoryNotificationRepository
	let authenticate: AuthenticateUseCase
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
		const activeRecipients = new InMemoryActiveRecipientsProvider()
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
		const adminId = randomUUID()
		const memberId = randomUUID()
		const userRepository = container.get(USER_TYPES.Repositories.User)
		await createAndSaveUser({
			userRepository,
			id: adminId,
			email: "admin.auth@test.com",
			password: "any_password",
			role: "ADMIN",
		})
		await createAndSaveUser({
			userRepository,
			id: memberId,
			email: "member.auth@test.com",
			password: "any_password",
			role: "MEMBER",
		})
		activeRecipients.userIds = [adminId, memberId]
		adminToken = await login("admin.auth@test.com")
		memberToken = await login("member.auth@test.com")
	})

	afterEach(async () => {
		container.restore()
		await fastifyServer.close()
	})

	test("401 sem token e nenhuma notificacao criada", async () => {
		const response = await request(fastifyServer.server)
			.post(NotificationRoutes.BROADCAST)
			.send(VALID_NOTICE)

		expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
		expect(notificationRepository.notifications.size).toBe(0)
	})

	test("401 com token invalido e nenhuma notificacao criada", async () => {
		const response = await request(fastifyServer.server)
			.post(NotificationRoutes.BROADCAST)
			.set("Authorization", "Bearer token.invalido.qualquer")
			.send(VALID_NOTICE)

		expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
		expect(notificationRepository.notifications.size).toBe(0)
	})

	test("403 para MEMBER e nenhuma notificacao criada", async () => {
		const response = await request(fastifyServer.server)
			.post(NotificationRoutes.BROADCAST)
			.set("Authorization", `Bearer ${memberToken}`)
			.send(VALID_NOTICE)

		expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
		expect(notificationRepository.notifications.size).toBe(0)
	})

	test("201 para ADMIN e notificacoes criadas", async () => {
		const response = await request(fastifyServer.server)
			.post(NotificationRoutes.BROADCAST)
			.set("Authorization", `Bearer ${adminToken}`)
			.send(VALID_NOTICE)

		expect(response.status).toBe(HTTP_STATUS.CREATED)
		expect(response.body).toEqual({ recipients: 2 })
		expect(notificationRepository.notifications.size).toBe(2)
	})
})
```

- **Step 2: Run test to verify it passes (caracterização)**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.business-flow.ts src/notification/infra/controller/broadcast-notice.authorization.business-flow-test.ts`
Expected: PASS (4 testes), pois `isProtected: true` e `onlyAdmin: true` foram configurados na task 5. Se algum falhar, corrigir a configuração no `broadcast-notice.controller.ts` (ou o status esperado se o `HTTP_STATUS` real do repositório divergir do assumido) e repetir.

- **Step 3: Provar a sensibilidade do teste a `onlyAdmin` (mutação temporária)**

Em `broadcast-notice.controller.ts`, remover temporariamente a linha `onlyAdmin: true,` do `register` e rodar:

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.business-flow.ts src/notification/infra/controller/broadcast-notice.authorization.business-flow-test.ts`
Expected: FAIL - `403 para MEMBER e nenhuma notificacao criada` com `expected 201 to be 403`. Restaurar `onlyAdmin: true,`.

- **Step 4: Provar a sensibilidade do teste a `isProtected` (mutação temporária)**

Remover temporariamente `isProtected: true,` (e `onlyAdmin: true,`, que depende dele) e rodar o mesmo comando do passo 3.
Expected: FAIL - os dois testes de 401 falham (o endpoint deixa de exigir token). Restaurar as duas linhas.

- **Step 5: Run test to verify it passes**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.business-flow.ts src/notification/infra/controller/broadcast-notice.authorization.business-flow-test.ts`
Expected: PASS (4 testes) e `git diff apps/backend/src/notification/infra/controller/broadcast-notice.controller.ts` vazio (mutações revertidas).

- **Step 6: Commit** *(sequential execution only; em wave paralela o orquestrador comita na barreira e você apenas reporta os arquivos)*

```bash
git add apps/backend/src/notification/infra/controller/broadcast-notice.authorization.business-flow-test.ts
git commit -m "test(notification): cobre autorizacao do endpoint de broadcast"
```

## Critérios de Sucesso

- Sem token: 401; token inválido: 401; `MEMBER`: 403; `ADMIN`: 201 (FR-016).
- Nos casos 401 e 403 nenhuma notificação é criada.
- Remover `onlyAdmin` ou `isProtected` do controller faz pelo menos um teste falhar (sensibilidade comprovada no passo 3 e 4).
