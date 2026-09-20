import { randomUUID } from "node:crypto"
import request from "supertest"
import { createAndSaveUser } from "test/factory/create-and-save-user"
import { serverBuildForTest } from "test/factory/server-build-for-test"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { InMemoryActiveRecipientsProvider } from "@/notification/infra/provider/in-memory/in-memory-active-recipients.provider.js"
import { InMemoryNotificationRepository } from "@/notification/infra/repository/in-memory/in-memory-notification.repository.js"
import type { AuthenticateUseCase } from "@/session/application/use-case/authenticate.usecase.js"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository.js"
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
	let userRepository: InMemoryUserRepository
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
		userRepository = new InMemoryUserRepository()
		container
			.rebind(USER_TYPES.Repositories.User)
			.toConstantValue(userRepository)
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
		[
			"titulo acima de 100 caracteres",
			{ title: "a".repeat(101), message: "Mensagem" },
		],
		[
			"mensagem acima de 500 caracteres",
			{ title: "Aviso", message: "a".repeat(501) },
		],
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

	test.each([
		["titulo so com espacos", { title: "     ", message: "Mensagem valida" }],
		["mensagem so com espacos", { title: "Titulo valido", message: "     " }],
		["titulo e mensagem so com espacos", { title: "   ", message: "   " }],
		[
			"titulo com tabs e quebras de linha",
			{ title: "\t\n ", message: "Mensagem valida" },
		],
	])("Review Focus: %s retorna 400 e nunca cria aviso vazio", async (_, body) => {
		const response = await broadcast(body)

		expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
		expect(notificationRepository.notifications.size).toBe(0)
	})
})
