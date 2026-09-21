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

const VALID_NOTICE = {
	title: "Manutencao programada",
	message: "O sistema ficara fora do ar as 22h.",
}

describe("Autorizacao de POST /api/v1/notifications/broadcast", () => {
	let fastifyServer: FastifyAdapter
	let notificationRepository: InMemoryNotificationRepository
	let activeRecipients: InMemoryActiveRecipientsProvider
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
		activeRecipients = new InMemoryActiveRecipientsProvider()
		const userRepository = new InMemoryUserRepository()
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
		const adminId = randomUUID()
		const memberId = randomUUID()
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
		activeRecipients.adminIds = [adminId]
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

	test("FR-017: 401 sem token mesmo com audience valido e nenhuma notificacao criada", async () => {
		const response = await request(fastifyServer.server)
			.post(NotificationRoutes.BROADCAST)
			.send({ ...VALID_NOTICE, audience: "MEMBERS" })

		expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
		expect(notificationRepository.notifications.size).toBe(0)
	})

	test("FR-017: 403 para MEMBER mesmo com audience ADMINS e nenhuma notificacao criada", async () => {
		const response = await request(fastifyServer.server)
			.post(NotificationRoutes.BROADCAST)
			.set("Authorization", `Bearer ${memberToken}`)
			.send({ ...VALID_NOTICE, audience: "ADMINS" })

		expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
		expect(notificationRepository.notifications.size).toBe(0)
	})

	test("201 para ADMIN com audience MEMBERS entrega so ao aluno", async () => {
		const response = await request(fastifyServer.server)
			.post(NotificationRoutes.BROADCAST)
			.set("Authorization", `Bearer ${adminToken}`)
			.send({ ...VALID_NOTICE, audience: "MEMBERS" })

		expect(response.status).toBe(HTTP_STATUS.CREATED)
		expect(response.body).toEqual({ recipients: 1 })
		expect(notificationRepository.notifications.size).toBe(1)
	})
})
