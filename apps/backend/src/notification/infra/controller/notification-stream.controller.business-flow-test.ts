import { randomUUID } from "node:crypto"
import type { IncomingMessage } from "node:http"
import request from "supertest"
import { createAndSaveUser } from "test/factory/create-and-save-user"
import { serverBuildForTest } from "test/factory/server-build-for-test"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
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

describe("NotificationStreamController", () => {
	let fastifyServer: FastifyAdapter
	let authenticate: AuthenticateUseCase
	let token: string
	let authenticatedUserId: string

	beforeEach(async () => {
		container.snapshot()
		container
			.rebind(NOTIFICATION_TYPES.Repositories.Notification)
			.toConstantValue(new InMemoryNotificationRepository())
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
			email: "notification.stream.user@test.com",
			password: "any_password",
		})
		const authResult = await authenticate.execute({
			email: "notification.stream.user@test.com",
			password: "any_password",
		})
		token = authResult.force.success().value.token
	})

	afterEach(async () => {
		container.restore()
		await fastifyServer.close()
	})

	test("GET /stream returns SSE headers and initial event", async () => {
		const streamResponse = await openNotificationStream({
			server: fastifyServer,
			token,
		})

		expect(streamResponse.headers["content-type"]).toContain(
			"text/event-stream",
		)
		expect(streamResponse.headers["cache-control"]).toBe("no-cache")
		expect(streamResponse.headers.connection).toBe("keep-alive")
		expect(streamResponse.headers["x-accel-buffering"]).toBe("no")
		expect(streamResponse.firstChunk).toContain('data: {"type":"connected"')
		expect(streamResponse.firstChunk).toContain(
			`"userId":"${authenticatedUserId}"`,
		)
	})

	test("GET /stream returns 401 without token", async () => {
		const response = await request(fastifyServer.server).get(
			NotificationRoutes.STREAM,
		)

		expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
	})
})

function openNotificationStream(input: {
	server: FastifyAdapter
	token: string
}): Promise<{ headers: IncomingMessage["headers"]; firstChunk: string }> {
	return new Promise((resolve, reject) => {
		let settled = false
		const streamRequest = request(input.server.server)
			.get(NotificationRoutes.STREAM)
			.set("Authorization", `Bearer ${input.token}`)
			.buffer(false)
			.timeout({ response: 1000, deadline: 2000 })

		streamRequest.on("response", (response: IncomingMessage) => {
			response.once("data", (chunk) => {
				settled = true
				resolve({
					headers: response.headers,
					firstChunk: chunk.toString(),
				})
				response.destroy()
			})
		})

		streamRequest.end((error) => {
			if (!error || isExpectedStreamAbort(error, settled)) return
			reject(error)
		})
	})
}

function isExpectedStreamAbort(error: Error, settled: boolean): boolean {
	return settled && error.message.toLowerCase().includes("aborted")
}
