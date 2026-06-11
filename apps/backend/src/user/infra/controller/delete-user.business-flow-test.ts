import { randomUUID } from "node:crypto"
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

const routeFor = (id: string) => UserRoutes.DELETE.replace(":userId", id)

describe("Excluir Usuário (soft delete)", () => {
	let fastifyServer: FastifyAdapter
	let userRepository: InMemoryUserRepository
	let authenticate: AuthenticateUseCase
	let token: string
	let adminId: string

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
		adminId = randomUUID()
		await createAndSaveUser({
			userRepository,
			id: adminId,
			email: "auth@delete.test",
			password: "any_password",
			role: "ADMIN",
		})
		const result = await authenticate.execute({
			email: "auth@delete.test",
			password: "any_password",
		})
		token = result.force.success().value.token
	})

	afterEach(async () => {
		container.restore()
		await fastifyServer.close()
	})

	test("Deve excluir (soft delete) usuário existente e responder 204", async () => {
		const targetId = randomUUID()
		await createAndSaveUser({
			userRepository,
			id: targetId,
			email: "target@delete.test",
			role: "MEMBER",
		})

		const response = await request(fastifyServer.server)
			.delete(routeFor(targetId))
			.set("Authorization", `Bearer ${token}`)

		expect(response.status).toBe(HTTP_STATUS.NO_CONTENT)
		const deletedUser = await userRepository.userOfId(targetId)
		expect(deletedUser).toBeNull()
	})

	test("Deve retornar 401 quando o JWT não é fornecido", async () => {
		const response = await request(fastifyServer.server).delete(
			routeFor(randomUUID()),
		)

		expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
	})

	test("Deve retornar 403 quando o solicitante não é admin", async () => {
		await createAndSaveUser({
			userRepository,
			id: randomUUID(),
			email: "member@delete.test",
			password: "member_password",
			role: "MEMBER",
		})
		const memberResult = await authenticate.execute({
			email: "member@delete.test",
			password: "member_password",
		})
		const memberToken = memberResult.force.success().value.token

		const response = await request(fastifyServer.server)
			.delete(routeFor(randomUUID()))
			.set("Authorization", `Bearer ${memberToken}`)

		expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
	})

	test("Deve retornar 403 ao tentar excluir a si mesmo", async () => {
		const response = await request(fastifyServer.server)
			.delete(routeFor(adminId))
			.set("Authorization", `Bearer ${token}`)

		expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
		expect(response.body).toHaveProperty("message")
	})

	test("Deve retornar 403 ao tentar excluir o super admin", async () => {
		const superAdminId = randomUUID()
		await createAndSaveUser({
			userRepository,
			id: superAdminId,
			email: "superadmin@delete.test",
			role: "ADMIN",
			isSuperAdmin: true,
		})

		const response = await request(fastifyServer.server)
			.delete(routeFor(superAdminId))
			.set("Authorization", `Bearer ${token}`)

		expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
		expect(response.body).toHaveProperty("message")
	})

	test("Deve retornar 404 quando o usuário alvo não existe", async () => {
		const response = await request(fastifyServer.server)
			.delete(routeFor(randomUUID()))
			.set("Authorization", `Bearer ${token}`)

		expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
		expect(response.body).toHaveProperty("message")
	})
})
