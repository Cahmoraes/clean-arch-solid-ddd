import request from "supertest"
import { createAndSaveCheckIn } from "test/factory/create-and-save-check-in"
import { createAndSaveGym } from "test/factory/create-and-save-gym"
import { createAndSaveUser } from "test/factory/create-and-save-user"
import { serverBuildForTest } from "test/factory/server-build-for-test"
import { afterEach, beforeEach, describe, expect, test } from "vitest"
import { CheckInRoutes } from "@/check-in/infra/controller/routes/check-in-routes"
import type { AuthenticateUseCase } from "@/session/application/use-case/authenticate.usecase"
import { InMemoryCheckInRepository } from "@/shared/infra/database/repository/in-memory/in-memory-check-in-repository"
import { InMemoryGymRepository } from "@/shared/infra/database/repository/in-memory/in-memory-gym-repository"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import {
	AUTH_TYPES,
	CHECKIN_TYPES,
	GYM_TYPES,
	USER_TYPES,
} from "@/shared/infra/ioc/types"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"
import { RoleValues } from "@/user/domain/value-object/role"

describe("Check-in Contract Tests", () => {
	let fastifyServer: FastifyAdapter
	let userRepository: InMemoryUserRepository
	let gymRepository: InMemoryGymRepository
	let checkInRepository: InMemoryCheckInRepository
	let authenticate: AuthenticateUseCase

	beforeEach(async () => {
		container.snapshot()
		userRepository = new InMemoryUserRepository()
		gymRepository = new InMemoryGymRepository()
		checkInRepository = new InMemoryCheckInRepository()
		container
			.rebind(USER_TYPES.Repositories.User)
			.toConstantValue(userRepository)
		container.rebind(GYM_TYPES.Repositories.Gym).toConstantValue(gymRepository)
		container
			.rebind(CHECKIN_TYPES.Repositories.CheckIn)
			.toConstantValue(checkInRepository)
		authenticate = container.get<AuthenticateUseCase>(
			AUTH_TYPES.UseCases.Authenticate,
		)
		fastifyServer = await serverBuildForTest()
		await fastifyServer.ready()
	})

	afterEach(async () => {
		container.restore()
		await fastifyServer.close()
	})

	async function getToken(
		email = "checkin@test.com",
		password = "any_password",
	): Promise<string> {
		await createAndSaveUser({
			userRepository,
			email,
			password,
			role: RoleValues.ADMIN,
		})
		const result = await authenticate.execute({ email, password })
		return result.force.success().value.token
	}

	describe("POST /check-ins", () => {
		test("deve satisfazer a spec com status 201 ao criar check-in", async () => {
			const token = await getToken()
			const gym = await createAndSaveGym({
				gymRepository,
				id: "gym-checkin-id",
				latitude: -27.0747279,
				longitude: -49.4889672,
			})

			const response = await request(fastifyServer.server)
				.post(CheckInRoutes.CREATE)
				.set("Authorization", `Bearer ${token}`)
				.send({
					userId: "any_user_id",
					gymId: gym.id,
					userLatitude: -27.0747279,
					userLongitude: -49.4889672,
				})

			expect(response.status).toBe(201)
			expect(response).toSatisfyApiSpec()
		})

		test("deve satisfazer a spec com status 400 para dados invalidos", async () => {
			const token = await getToken("checkin2@test.com", "any_password")

			const response = await request(fastifyServer.server)
				.post(CheckInRoutes.CREATE)
				.set("Authorization", `Bearer ${token}`)
				.send({})

			expect(response.status).toBe(400)
			expect(response).toSatisfyApiSpec()
		})
	})

	describe("POST /check-ins/validate", () => {
		test("deve satisfazer a spec com status 200 ao validar check-in", async () => {
			const token = await getToken("validate@test.com", "any_password")
			const user = await createAndSaveUser({
				userRepository,
				id: "validate-user-id",
				email: "validate-user@test.com",
			})
			const checkIn = await createAndSaveCheckIn({
				checkInRepository,
				id: "checkin-validate-id",
				userId: user.id ?? "validate-user-id",
			})

			const response = await request(fastifyServer.server)
				.post(CheckInRoutes.VALIDATE)
				.set("Authorization", `Bearer ${token}`)
				.send({ checkInId: checkIn.id })

			expect(response.status).toBe(200)
			expect(response).toSatisfyApiSpec()
		})

		test("deve satisfazer a spec com status 409 para check-in inexistente", async () => {
			const token = await getToken("validate2@test.com", "any_password")

			const response = await request(fastifyServer.server)
				.post(CheckInRoutes.VALIDATE)
				.set("Authorization", `Bearer ${token}`)
				.send({ checkInId: "nonexistent-id" })

			expect(response.status).toBe(409)
			expect(response).toSatisfyApiSpec()
		})
	})
})
