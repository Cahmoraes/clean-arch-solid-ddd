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

describe("Obter Perfil do usuário por ID", () => {
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

	test("Deve obter o perfil de um usuário", async () => {
		const input = {
			name: "any_name",
			email: "any@email.com",
			password: "any_password",
		}

		const user = await createAndSaveUser({
			userRepository,
			...input,
		})
		// biome-ignore lint/style/noNonNullAssertion: para testes
		// biome-ignore lint/suspicious/noNonNullAssertedOptionalChain: para testes
		const userId = user?.id!
		const result = await authenticate.execute({
			email: input.email,
			password: input.password,
		})
		const token = result.force.success().value.token
		const response = await request(fastifyServer.server)
			.get(toPath(userId))
			.set("Authorization", `Bearer ${token}`)
			.send()

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body).toHaveProperty("id")
		expect(response.body).toHaveProperty("name")
		expect(response.body).toHaveProperty("email")
		expect(response.body).toEqual({
			id: userId,
			name: input.name,
			email: input.email,
			role: "MEMBER",
		})
	})

	test("Não deve permitir que MEMBER acesse o perfil de outro usuário", async () => {
		const requesterId = "member-requester-id"
		const targetId = "member-target-id"
		await createAndSaveUser({
			userRepository,
			id: requesterId,
			email: "member.requester@email.com",
			password: "member_password",
		})
		await createAndSaveUser({
			userRepository,
			id: targetId,
			email: "member.target@email.com",
		})

		const result = await authenticate.execute({
			email: "member.requester@email.com",
			password: "member_password",
		})
		const token = result.force.success().value.token
		const response = await request(fastifyServer.server)
			.get(toPath(targetId))
			.set("Authorization", `Bearer ${token}`)
			.send()

		expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
		expect(response.body).toEqual({ message: "Forbidden" })
	})

	test("Deve permitir que ADMIN acesse o perfil de qualquer usuário", async () => {
		const adminId = "admin-requester-id"
		const targetId = "admin-target-id"
		await createAndSaveUser({
			userRepository,
			id: adminId,
			email: "admin.requester@email.com",
			password: "admin_password",
			role: "ADMIN",
		})
		await createAndSaveUser({
			userRepository,
			id: targetId,
			name: "target_name",
			email: "admin.target@email.com",
		})

		const result = await authenticate.execute({
			email: "admin.requester@email.com",
			password: "admin_password",
		})
		const token = result.force.success().value.token
		const response = await request(fastifyServer.server)
			.get(toPath(targetId))
			.set("Authorization", `Bearer ${token}`)
			.send()

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body).toEqual({
			id: targetId,
			name: "target_name",
			email: "admin.target@email.com",
			role: "MEMBER",
		})
	})

	test("Não deve obter o perfil de um usuário inexistente", async () => {
		const response = await request(fastifyServer.server)
			.get(toPath("inexistent_id"))
			.send()
		expect(response.body).toHaveProperty("message")
		expect(response.body.message).toEqual("Unauthorized")
		expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
	})

	function toPath(userId: string): string {
		return UserRoutes.PROFILE.replace(":userId", userId)
	}
})
