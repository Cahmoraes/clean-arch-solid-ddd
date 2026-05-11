/** biome-ignore-all lint/style/noNonNullAssertion: for testing */
import request from "supertest"
import { createAndSaveCheckIn } from "test/factory/create-and-save-check-in"
import { createAndSaveUser } from "test/factory/create-and-save-user"
import { afterAll, beforeAll, describe, expect, test } from "vitest"
import { serverBuild } from "@/bootstrap/server-build"
import { CheckInRoutes } from "@/check-in/infra/controller/routes/check-in-routes"
import type { AuthenticateUseCase } from "@/session/application/use-case/authenticate.usecase"
import { InMemoryCheckInRepository } from "@/shared/infra/database/repository/in-memory/in-memory-check-in-repository"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { AUTH_TYPES, CHECKIN_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"

describe("Validar CheckIn", () => {
	let server: FastifyAdapter
	let checkInRepository: InMemoryCheckInRepository
	let userRepository: InMemoryUserRepository
	let adminToken: string

	beforeAll(async () => {
		container.snapshot()
		checkInRepository = new InMemoryCheckInRepository()
		userRepository = new InMemoryUserRepository()
		container.unbind(CHECKIN_TYPES.Repositories.CheckIn)
		container
			.bind(CHECKIN_TYPES.Repositories.CheckIn)
			.toConstantValue(checkInRepository)
		container.unbind(USER_TYPES.Repositories.User)
		container.bind(USER_TYPES.Repositories.User).toConstantValue(userRepository)
		server = await serverBuild()
		await server.ready()
		const adminEmail = "admin@validate-checkin.test"
		const adminPassword = "admin_password"
		await createAndSaveUser({
			userRepository,
			id: "admin-user-id",
			email: adminEmail,
			password: adminPassword,
			role: "ADMIN",
		})
		const authenticate = container.get<AuthenticateUseCase>(
			AUTH_TYPES.UseCases.Authenticate,
		)
		const authResult = await authenticate.execute({
			email: adminEmail,
			password: adminPassword,
		})
		adminToken = authResult.force.success().value.token
	})

	afterAll(async () => {
		container.restore()
		await server.close()
	})

	test("should validate a check-in", async () => {
		const user = await createAndSaveUser({
			userRepository,
			id: "member-user-id",
			email: "member@validate-checkin.test",
		})
		const checkIn = await createAndSaveCheckIn({
			id: "check-in-id",
			checkInRepository,
			userId: user.id!,
		})
		const response = await request(server.server)
			.post(CheckInRoutes.VALIDATE)
			.set("Authorization", `Bearer ${adminToken}`)
			.send({
				checkInId: checkIn.id!,
			})
		expect(response.status).toBe(HTTP_STATUS.OK)
		const responseBody = response.body
		expect(responseBody).toHaveProperty("validatedAt")
		expect(new Date(responseBody.validatedAt).getTime()).not.toBeNaN()
	})

	test("should return 400 for invalid check-in ID", async () => {
		const response = await request(server.server)
			.post(CheckInRoutes.VALIDATE)
			.set("Authorization", `Bearer ${adminToken}`)
			.send({
				checkInId: "invalid-id",
			})

		expect(response.status).toBe(HTTP_STATUS.CONFLICT)
	})
})
