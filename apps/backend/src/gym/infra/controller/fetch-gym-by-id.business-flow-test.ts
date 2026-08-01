import request from "supertest"
import { createAndSaveGym } from "test/factory/create-and-save-gym"
import { createAndSaveUser } from "test/factory/create-and-save-user"
import { serverBuildForTest } from "test/factory/server-build-for-test"

import type { AuthenticateUseCase } from "@/session/application/use-case/authenticate.usecase"
import { InMemoryGymRepository } from "@/shared/infra/database/repository/in-memory/in-memory-gym-repository"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { AUTH_TYPES, GYM_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"
import { RoleValues } from "@/user/domain/value-object/role"

describe("Buscar Academia por ID", () => {
	let fastifyServer: FastifyAdapter
	let gymRepository: InMemoryGymRepository
	let userRepository: InMemoryUserRepository
	let authenticate: AuthenticateUseCase
	let memberToken: string

	beforeEach(async () => {
		container.snapshot()
		gymRepository = new InMemoryGymRepository()
		userRepository = new InMemoryUserRepository()
		container.rebind(GYM_TYPES.Repositories.Gym).toConstantValue(gymRepository)
		container
			.rebind(USER_TYPES.Repositories.User)
			.toConstantValue(userRepository)
		authenticate = container.get<AuthenticateUseCase>(
			AUTH_TYPES.UseCases.Authenticate,
		)

		await createAndSaveUser({
			userRepository,
			email: "member@test.com",
			password: "any_password",
			role: RoleValues.MEMBER,
		})
		const memberResult = await authenticate.execute({
			email: "member@test.com",
			password: "any_password",
		})
		memberToken = memberResult.force.success().value.token

		fastifyServer = await serverBuildForTest()
		await fastifyServer.ready()
	})

	afterEach(async () => {
		container.restore()
		await fastifyServer.close()
	})

	test("Deve retornar 200 com os dados da academia quando encontrada", async () => {
		await createAndSaveGym({
			id: "gym-001",
			gymRepository,
			title: "Academia Força Total",
			description: "A melhor academia",
			phone: "11988880000",
			address: "Av. Principal, 100",
			latitude: -23.563099,
			longitude: -46.656571,
		})

		const response = await request(fastifyServer.server)
			.get("/gyms/gym-001")
			.set("Authorization", `Bearer ${memberToken}`)

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body).toMatchObject({
			id: "gym-001",
			title: "Academia Força Total",
			description: "A melhor academia",
			phone: "11988880000",
			address: "Av. Principal, 100",
			latitude: -23.563099,
			longitude: -46.656571,
		})
	})

	test("Deve retornar 404 quando academia não existe", async () => {
		const response = await request(fastifyServer.server)
			.get("/gyms/id-inexistente")
			.set("Authorization", `Bearer ${memberToken}`)

		expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
	})
})
