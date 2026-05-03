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

describe("Atualizar Perfil de Usuário", () => {
	let fastifyServer: FastifyAdapter
	let userRepository: InMemoryUserRepository
	let authenticate: AuthenticateUseCase
	let token: string
	const userId = "profile-target-id"

	beforeEach(async () => {
		container.snapshot()
		userRepository = new InMemoryUserRepository()
		container
			.rebind(USER_TYPES.Repositories.User)
			.toConstantValue(userRepository)
		authenticate = container.get<AuthenticateUseCase>(
			AUTH_TYPES.UseCases.Authenticate,
		)
		fastifyServer = await serverBuildForTest()
		await fastifyServer.ready()
		await createAndSaveUser({
			userRepository,
			id: userId,
			name: "old_name",
			email: "old@profile.test",
			password: "any_password",
		})
		const result = await authenticate.execute({
			email: "old@profile.test",
			password: "any_password",
		})
		token = result.force.success().value.token
	})

	afterEach(async () => {
		container.restore()
		await fastifyServer.close()
	})

	function profileUrl(id: string): string {
		return UserRoutes.PROFILE.replace(":userId", id)
	}

	test("Deve atualizar nome e email do usuário e responder 201", async () => {
		const response = await request(fastifyServer.server)
			.patch(profileUrl(userId))
			.set("Authorization", `Bearer ${token}`)
			.send({
				name: "new valid name",
				email: "new@profile.test",
			})

		expect(response.status).toBe(HTTP_STATUS.CREATED)
		expect(response.body).toEqual({
			message: "User created",
			email: "new@profile.test",
		})
		const updated = await userRepository.userOfId(userId)
		expect(updated?.name).toBe("new valid name")
		expect(updated?.email).toBe("new@profile.test")
	})

	test("Deve retornar 401 quando o JWT não é fornecido", async () => {
		const response = await request(fastifyServer.server)
			.patch(profileUrl(userId))
			.send({ name: "new valid name", email: "new@profile.test" })

		expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
	})

	test("Deve retornar 400 quando o email é inválido", async () => {
		const response = await request(fastifyServer.server)
			.patch(profileUrl(userId))
			.set("Authorization", `Bearer ${token}`)
			.send({ name: "new valid name", email: "invalid-email" })

		expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
		expect(response.body).toHaveProperty("message")
	})

	test("Deve retornar 422 quando o usuário não existe", async () => {
		const response = await request(fastifyServer.server)
			.patch(profileUrl("non-existing-user-id"))
			.set("Authorization", `Bearer ${token}`)
			.send({ name: "new valid name", email: "ghost@profile.test" })

		expect(response.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY)
		expect(response.body).toHaveProperty("message")
	})
})
