import request from "supertest"
import { createAndSaveGym } from "test/factory/create-and-save-gym"
import { createAndSaveUser } from "test/factory/create-and-save-user"
import { serverBuildForTest } from "test/factory/server-build-for-test"
import { afterEach, beforeEach, describe, expect, test } from "vitest"
import { GymRoutes } from "@/gym/infra/controller/routes/gym-routes"
import type { AuthenticateUseCase } from "@/session/application/use-case/authenticate.usecase"
import { InMemoryGymRepository } from "@/shared/infra/database/repository/in-memory/in-memory-gym-repository"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { AUTH_TYPES, GYM_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"
import { RoleValues } from "@/user/domain/value-object/role"

describe("Gym Contract Tests", () => {
	let fastifyServer: FastifyAdapter
	let userRepository: InMemoryUserRepository
	let gymRepository: InMemoryGymRepository
	let authenticate: AuthenticateUseCase

	beforeEach(async () => {
		container.snapshot()
		userRepository = new InMemoryUserRepository()
		gymRepository = new InMemoryGymRepository()
		container
			.rebind(USER_TYPES.Repositories.User)
			.toConstantValue(userRepository)
		container.rebind(GYM_TYPES.Repositories.Gym).toConstantValue(gymRepository)
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

	async function getAdminToken(): Promise<string> {
		await createAndSaveUser({
			userRepository,
			email: "admin@test.com",
			password: "any_password",
			role: RoleValues.ADMIN,
		})
		const result = await authenticate.execute({
			email: "admin@test.com",
			password: "any_password",
		})
		return result.force.success().value.token
	}

	describe("POST /gyms", () => {
		test("deve satisfazer a spec com status 201 ao criar academia", async () => {
			const token = await getAdminToken()

			const response = await request(fastifyServer.server)
				.post(GymRoutes.CREATE)
				.set("Authorization", `Bearer ${token}`)
				.send({
					cnpj: "11.222.333/0001-81",
					title: "Academia Teste",
					description: "Descricao teste",
					phone: "11999999999",
					latitude: -23.55052,
					longitude: -46.633308,
				})

			expect(response.status).toBe(201)
			expect(response).toSatisfyApiSpec()
		})

		test("deve satisfazer a spec com status 400 para dados invalidos", async () => {
			const token = await getAdminToken()

			const response = await request(fastifyServer.server)
				.post(GymRoutes.CREATE)
				.set("Authorization", `Bearer ${token}`)
				.send({
					title: "Academia Teste",
				})

			expect(response.status).toBe(400)
			expect(response).toSatisfyApiSpec()
		})
	})

	describe("GET /gyms/search/:name", () => {
		test("deve satisfazer a spec com status 200 ao buscar academia", async () => {
			await createAndSaveGym({
				gymRepository,
				title: "Smart Fit",
			})

			const response = await request(fastifyServer.server).get(
				GymRoutes.SEARCH.replace(":name", "Smart"),
			)

			expect(response.status).toBe(200)
			expect(response).toSatisfyApiSpec()
		})

		test("deve satisfazer a spec com status 404 quando nao encontrar", async () => {
			const response = await request(fastifyServer.server).get(
				GymRoutes.SEARCH.replace(":name", "Inexistente"),
			)

			expect(response.status).toBe(404)
			expect(response).toSatisfyApiSpec()
		})
	})
})
