import request from "supertest"
import { createAndSaveCheckIn } from "test/factory/create-and-save-check-in"
import { createAndSaveUser } from "test/factory/create-and-save-user"
import { serverBuildForTest } from "test/factory/server-build-for-test"

import type { AuthenticateUseCase } from "@/session/application/use-case/authenticate.usecase"
import { InMemoryCheckInRepository } from "@/shared/infra/database/repository/in-memory/in-memory-check-in-repository"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { AUTH_TYPES, CHECKIN_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"

import { CheckInRoutes } from "./routes/check-in-routes"

describe("Check-in Metrics (GET /check-ins/metrics/:userId)", () => {
	let fastifyServer: FastifyAdapter
	let userRepository: InMemoryUserRepository
	let checkInRepository: InMemoryCheckInRepository
	let authenticate: AuthenticateUseCase
	let token: string
	const userId = "metrics-user-id"

	beforeEach(async () => {
		container.snapshot()
		userRepository = new InMemoryUserRepository()
		checkInRepository = new InMemoryCheckInRepository()
		container
			.rebind(USER_TYPES.Repositories.User)
			.toConstantValue(userRepository)
		container
			.rebind(CHECKIN_TYPES.Repositories.CheckIn)
			.toConstantValue(checkInRepository)
		authenticate = container.get<AuthenticateUseCase>(
			AUTH_TYPES.UseCases.Authenticate,
		)
		fastifyServer = await serverBuildForTest()
		await fastifyServer.ready()
		await createAndSaveUser({
			userRepository,
			id: userId,
			email: "metrics@user.test",
			password: "any_password",
		})
		const result = await authenticate.execute({
			email: "metrics@user.test",
			password: "any_password",
		})
		token = result.force.success().value.token
	})

	afterEach(async () => {
		container.restore()
		await fastifyServer.close()
	})

	function metricsUrl(id: string): string {
		return CheckInRoutes.METRICS.replace(":userId", id)
	}

	test("Deve retornar 0 quando o usuário não tem check-ins", async () => {
		const response = await request(fastifyServer.server)
			.get(metricsUrl(userId))
			.set("Authorization", `Bearer ${token}`)

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body).toEqual({ checkInsCount: 0 })
	})

	test("Deve retornar a contagem total quando o usuário tem múltiplos check-ins", async () => {
		for (let i = 0; i < 5; i++) {
			await createAndSaveCheckIn({
				checkInRepository,
				id: `check-in-${i}`,
				userId,
				gymId: "gym-id",
				userLatitude: 0,
				userLongitude: 0,
			})
		}

		const response = await request(fastifyServer.server)
			.get(metricsUrl(userId))
			.set("Authorization", `Bearer ${token}`)

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body).toEqual({ checkInsCount: 5 })
	})

	test("Deve retornar 401 quando o JWT não é fornecido", async () => {
		const response = await request(fastifyServer.server).get(metricsUrl(userId))

		expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
	})

	describe("Controle de acesso", () => {
		let attackerToken: string
		const victimId = "victim-user-id"

		beforeEach(async () => {
			await createAndSaveUser({
				userRepository,
				id: victimId,
				email: "victim@user.test",
				password: "any_password",
			})
			await createAndSaveUser({
				userRepository,
				id: "attacker-user-id",
				email: "attacker@user.test",
				password: "any_password",
			})
			const attackerResult = await authenticate.execute({
				email: "attacker@user.test",
				password: "any_password",
			})
			attackerToken = attackerResult.force.success().value.token
		})

		test("Deve retornar 403 quando MEMBER tenta acessar métricas de outro usuário", async () => {
			const response = await request(fastifyServer.server)
				.get(metricsUrl(victimId))
				.set("Authorization", `Bearer ${attackerToken}`)

			expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
		})

		test("ADMIN deve poder acessar métricas de qualquer usuário", async () => {
			await createAndSaveUser({
				userRepository,
				id: "admin-user-id",
				email: "admin@user.test",
				password: "any_password",
				role: "ADMIN",
			})
			const adminResult = await authenticate.execute({
				email: "admin@user.test",
				password: "any_password",
			})
			const adminToken = adminResult.force.success().value.token

			const response = await request(fastifyServer.server)
				.get(metricsUrl(victimId))
				.set("Authorization", `Bearer ${adminToken}`)

			expect(response.status).toBe(HTTP_STATUS.OK)
		})
	})
})
