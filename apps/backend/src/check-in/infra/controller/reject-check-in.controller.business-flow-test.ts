/** biome-ignore-all lint/style/noNonNullAssertion: for testing */
import request from "supertest"
import { createAndSaveCheckIn } from "test/factory/create-and-save-check-in"
import { createAndSaveUser } from "test/factory/create-and-save-user"
import { isValidDate } from "test/is-valid-date"
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

describe("Rejeitar CheckIn", () => {
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
		const adminEmail = "admin@reject-checkin.test"
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

	test("should reject a pending check-in", async () => {
		const user = await createAndSaveUser({
			userRepository,
			id: "member-user-id-1",
			email: "member1@reject-checkin.test",
		})
		const checkIn = await createAndSaveCheckIn({
			id: "check-in-id-1",
			checkInRepository,
			userId: user.id!,
		})
		const response = await request(server.server)
			.patch(CheckInRoutes.REJECT)
			.set("Authorization", `Bearer ${adminToken}`)
			.send({
				checkInId: checkIn.id!,
			})
		expect(response.status).toBe(HTTP_STATUS.OK)
		const responseBody = response.body
		expect(responseBody).toHaveProperty("rejectedAt")
		expect(isValidDate(responseBody.rejectedAt)).toBeTruthy()
	})

	test("should reject a validated check-in (reversal)", async () => {
		const user = await createAndSaveUser({
			userRepository,
			id: "member-user-id-2",
			email: "member2@reject-checkin.test",
		})
		const checkIn = await createAndSaveCheckIn({
			id: "check-in-id-2",
			checkInRepository,
			userId: user.id!,
		})
		checkIn.validate()
		await checkInRepository.save(checkIn)

		const response = await request(server.server)
			.patch(CheckInRoutes.REJECT)
			.set("Authorization", `Bearer ${adminToken}`)
			.send({
				checkInId: checkIn.id!,
			})
		expect(response.status).toBe(HTTP_STATUS.OK)
		const responseBody = response.body
		expect(responseBody).toHaveProperty("rejectedAt")
		expect(isValidDate(responseBody.rejectedAt)).toBeTruthy()
	})

	test("should return 404 for non-existent check-in", async () => {
		const response = await request(server.server)
			.patch(CheckInRoutes.REJECT)
			.set("Authorization", `Bearer ${adminToken}`)
			.send({
				checkInId: "non-existent-id",
			})

		expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
		expect(response.body).toHaveProperty("message")
	})

	test("should be idempotent when rejecting an already rejected check-in", async () => {
		const user = await createAndSaveUser({
			userRepository,
			id: "member-user-id-3",
			email: "member3@reject-checkin.test",
		})
		const checkIn = await createAndSaveCheckIn({
			id: "check-in-id-3",
			checkInRepository,
			userId: user.id!,
		})
		checkIn.reject()
		await checkInRepository.save(checkIn)
		const firstRejectedAt = checkIn.rejectedAt

		const response = await request(server.server)
			.patch(CheckInRoutes.REJECT)
			.set("Authorization", `Bearer ${adminToken}`)
			.send({
				checkInId: checkIn.id!,
			})

		expect(response.status).toBe(HTTP_STATUS.OK)
		const responseBody = response.body
		expect(responseBody).toHaveProperty("rejectedAt")
		expect(new Date(responseBody.rejectedAt)).toEqual(firstRejectedAt)
	})

	test("should return 403 when user is not an admin", async () => {
		const normalUser = await createAndSaveUser({
			userRepository,
			id: "normal-user-id",
			email: "normaluser@reject-checkin.test",
			role: "USER",
		})
		const authenticate = container.get<AuthenticateUseCase>(
			AUTH_TYPES.UseCases.Authenticate,
		)
		const authResult = await authenticate.execute({
			email: "normaluser@reject-checkin.test",
			password: "Password123!",
		})
		const userToken = authResult.force.success().value.token

		const checkIn = await createAndSaveCheckIn({
			id: "check-in-id-4",
			checkInRepository,
			userId: normalUser.id!,
		})

		const response = await request(server.server)
			.patch(CheckInRoutes.REJECT)
			.set("Authorization", `Bearer ${userToken}`)
			.send({
				checkInId: checkIn.id!,
			})

		expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
	})

	test("should return 401 when authorization header is missing", async () => {
		const user = await createAndSaveUser({
			userRepository,
			id: "member-user-id-5",
			email: "member5@reject-checkin.test",
		})
		const checkIn = await createAndSaveCheckIn({
			id: "check-in-id-5",
			checkInRepository,
			userId: user.id!,
		})

		const response = await request(server.server)
			.patch(CheckInRoutes.REJECT)
			.send({
				checkInId: checkIn.id!,
			})

		expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
	})
})
