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

describe("Notification REST controllers", () => {
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
			.rebind(NOTIFICATION_TYPES.Infra.RedisNotificationSubscriber)
			.toConstantValue({
				subscribe: vi.fn().mockResolvedValue(undefined),
				disconnect: vi.fn().mockResolvedValue(undefined),
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
			email: "notification.user@test.com",
			password: "any_password",
		})
		const authResult = await authenticate.execute({
			email: "notification.user@test.com",
			password: "any_password",
		})
		token = authResult.force.success().value.token
	})

	afterEach(async () => {
		container.restore()
		await fastifyServer.close()
	})

	test("Deve listar notificações do usuário autenticado com filtro de não lidas", async () => {
		const unreadNotification = await createNotification({
			userId: authenticatedUserId,
			title: "Check-in aprovado",
			message: "Seu check-in foi aprovado com sucesso.",
			gymName: "Gym One",
			reason: "approved",
		})
		await createReadNotification({
			userId: authenticatedUserId,
			title: "Check-in rejeitado",
			message: "Seu check-in foi rejeitado.",
		})
		await createNotification({
			userId: randomUUID(),
			title: "Outra notificação",
			message: "Não deve aparecer",
		})
		const response = await request(fastifyServer.server)
			.get(NotificationRoutes.LIST)
			.query({ page: 1, unreadOnly: true })
			.set("Authorization", `Bearer ${token}`)

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body.total).toBe(1)
		expect(response.body.notifications).toEqual([
			{
				id: unreadNotification.id,
				type: "CHECK_IN_APPROVED",
				title: "Check-in aprovado",
				message: "Seu check-in foi aprovado com sucesso.",
				gymName: "Gym One",
				reason: "approved",
				readAt: null,
				createdAt: unreadNotification.createdAt.toISOString(),
			},
		])
	})

	test("Deve retornar a contagem de notificações não lidas", async () => {
		await createNotification({ userId: authenticatedUserId })
		await createNotification({ userId: authenticatedUserId })
		await createReadNotification({ userId: authenticatedUserId })
		await createNotification({ userId: randomUUID() })
		const response = await request(fastifyServer.server)
			.get(NotificationRoutes.UNREAD_COUNT)
			.set("Authorization", `Bearer ${token}`)

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body).toEqual({ count: 2 })
	})

	test("Deve marcar uma notificação como lida", async () => {
		const notification = await createNotification({
			userId: authenticatedUserId,
		})
		const response = await request(fastifyServer.server)
			.patch(toMarkAsReadPath(notification.id))
			.set("Authorization", `Bearer ${token}`)

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body.readAt).toEqual(expect.any(String))
		const storedNotification = await notificationRepository.findById(
			notification.id,
		)
		expect(storedNotification?.readAt?.toISOString()).toBe(response.body.readAt)
	})

	test("Deve retornar 404 ao tentar marcar como lida uma notificação de outro usuário", async () => {
		const notification = await createNotification({ userId: randomUUID() })
		const response = await request(fastifyServer.server)
			.patch(toMarkAsReadPath(notification.id))
			.set("Authorization", `Bearer ${token}`)

		expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
		expect(response.body).toEqual({ message: "Notification not found" })
	})

	test("Deve marcar todas as notificações do usuário como lidas", async () => {
		await createNotification({ userId: authenticatedUserId })
		await createNotification({ userId: authenticatedUserId })
		await createReadNotification({ userId: authenticatedUserId })
		await createNotification({ userId: randomUUID() })
		const response = await request(fastifyServer.server)
			.patch(NotificationRoutes.MARK_ALL_AS_READ)
			.set("Authorization", `Bearer ${token}`)

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body).toEqual({ markedCount: 2 })
		expect(
			await notificationRepository.countUnreadByUserId(authenticatedUserId),
		).toBe(0)
	})
})

async function createNotification(
	input: Partial<{
		userId: string
		title: string
		message: string
		gymName: string
		reason: string
	}> = {},
): Promise<Notification> {
	const notification = Notification.create({
		id: randomUUID(),
		userId: input.userId ?? randomUUID(),
		type: "CHECK_IN_APPROVED",
		title: input.title ?? "Check-in aprovado",
		message: input.message ?? "Seu check-in foi aprovado com sucesso.",
		gymName: input.gymName,
		reason: input.reason,
	})
	const notificationRepository = container.get<InMemoryNotificationRepository>(
		NOTIFICATION_TYPES.Repositories.Notification,
	)
	await notificationRepository.save(notification)
	return notification
}

async function createReadNotification(
	input: Partial<{
		userId: string
		title: string
		message: string
	}> = {},
): Promise<Notification> {
	const notification = await createNotification(input)
	notification.markAsRead()
	const notificationRepository = container.get<InMemoryNotificationRepository>(
		NOTIFICATION_TYPES.Repositories.Notification,
	)
	await notificationRepository.save(notification)
	return notification
}

function toMarkAsReadPath(id: string): string {
	return NotificationRoutes.MARK_AS_READ.replace(":id", id)
}
