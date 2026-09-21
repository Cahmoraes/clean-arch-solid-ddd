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
