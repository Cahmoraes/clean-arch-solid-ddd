import request from "supertest"
import { createAndSaveUser } from "test/factory/create-and-save-user"
import { serverBuildForTest } from "test/factory/server-build-for-test"
import type { AuthenticateUseCase } from "@/session/application/use-case/authenticate.usecase"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { AUTH_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"

import { UserRoutes } from "./routes/user-routes"

describe("Obter Meu Perfil", () => {
	let fastifyServer: FastifyAdapter
	let userRepository: InMemoryUserRepository
	let authenticate: AuthenticateUseCase

	beforeEach(async () => {
		userRepository = new InMemoryUserRepository()
		container.snapshot()

		container
			.rebind(USER_TYPES.Repositories.User)
			.toConstantValue(userRepository)
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

	test("Deve retornar hasPassword e authMethods em GET /users/me", async () => {
		const input = {
			name: "any_name",
			email: "any@email.com",
			password: "any_password",
		}
		const user = await createAndSaveUser({
			userRepository,
			...input,
		})
		const token = (
			await authenticate.execute({
				email: input.email,
				password: input.password,
			})
		).force.success().value.token
		const response = await request(fastifyServer.server)
			.get(UserRoutes.ME)
			.set("Authorization", `Bearer ${token}`)

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body).toEqual({
			id: user.id,
			name: input.name,
			email: input.email,
			role: "MEMBER",
			hasPassword: true,
			authMethods: ["password"],
		})
	})

	test("Deve retornar authMethods com password e google em GET /users/me para conta mista", async () => {
		const user = await createAndSaveUser({
			userRepository,
			name: "mixed_name",
			email: "mixed@doe.com",
			password: "Senha123!",
			googleId: "google-sub-mixed",
		})
		const token = (
			await authenticate.execute({
				email: user.email,
				password: "Senha123!",
			})
		).force.success().value.token
		const response = await request(fastifyServer.server)
			.get(UserRoutes.ME)
			.set("Authorization", `Bearer ${token}`)

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body).toMatchObject({
			id: user.id,
			hasPassword: true,
			authMethods: ["password", "google"],
		})
	})

	test("Não deve obter o perfil de um usuário inexistente", async () => {
		const response = await request(fastifyServer.server)
			.get(UserRoutes.ME)
			.send()
		expect(response.body).toHaveProperty("message")
		expect(response.body.message).toEqual("Unauthorized")
		expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
	})
})
