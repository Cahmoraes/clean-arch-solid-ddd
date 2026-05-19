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

describe("Demover Administrador", () => {
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
			email: "auth@demote.test",
			password: "any_password",
			role: "ADMIN",
		})
		const result = await authenticate.execute({
			email: "auth@demote.test",
			password: "any_password",
		})
		token = result.force.success().value.token
	})

	afterEach(async () => {
		container.restore()
		await fastifyServer.close()
	})

	test("Deve demover admin e responder 200", async () => {
		const targetId = randomUUID()
		await createAndSaveUser({
			userRepository,
			id: targetId,
			email: "target@demote.test",
			role: "ADMIN",
		})

		const response = await request(fastifyServer.server)
			.patch(UserRoutes.DEMOTE_FROM_ADMIN)
			.set("Authorization", `Bearer ${token}`)
			.send({ userId: targetId })

		expect(response.status).toBe(HTTP_STATUS.OK)
		const updated = await userRepository.userOfId(targetId)
		expect(updated?.role).toBe("MEMBER")
	})

	test("Deve retornar 401 quando o JWT não é fornecido", async () => {
		const response = await request(fastifyServer.server)
			.patch(UserRoutes.DEMOTE_FROM_ADMIN)
			.send({ userId: randomUUID() })

		expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
	})

	test("Deve retornar 403 quando o solicitante não é admin", async () => {
		await createAndSaveUser({
			userRepository,
			id: randomUUID(),
			email: "member@demote.test",
			password: "member_password",
			role: "MEMBER",
		})
		const memberResult = await authenticate.execute({
			email: "member@demote.test",
			password: "member_password",
		})
		const memberToken = memberResult.force.success().value.token

		const response = await request(fastifyServer.server)
			.patch(UserRoutes.DEMOTE_FROM_ADMIN)
			.set("Authorization", `Bearer ${memberToken}`)
			.send({ userId: randomUUID() })

		expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
	})

	test("Deve retornar 400 quando o body é inválido (userId não-UUID)", async () => {
		const response = await request(fastifyServer.server)
			.patch(UserRoutes.DEMOTE_FROM_ADMIN)
			.set("Authorization", `Bearer ${token}`)
			.send({ userId: "not-a-uuid" })

		expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
		expect(response.body).toHaveProperty("message")
	})

	test("Deve retornar 422 quando o usuário alvo não existe", async () => {
		const response = await request(fastifyServer.server)
			.patch(UserRoutes.DEMOTE_FROM_ADMIN)
			.set("Authorization", `Bearer ${token}`)
			.send({ userId: randomUUID() })

		expect(response.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY)
		expect(response.body).toHaveProperty("message")
	})

	test("Deve retornar 422 ao tentar demover admin@admin.com", async () => {
		const superAdminId = randomUUID()
		await createAndSaveUser({
			userRepository,
			id: superAdminId,
			email: "admin@admin.com",
			role: "ADMIN",
		})

		const response = await request(fastifyServer.server)
			.patch(UserRoutes.DEMOTE_FROM_ADMIN)
			.set("Authorization", `Bearer ${token}`)
			.send({ userId: superAdminId })

		expect(response.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY)
		expect(response.body).toHaveProperty("message")
	})

	test("Deve retornar 422 ao tentar demover usuário que não é admin", async () => {
		const targetId = randomUUID()
		await createAndSaveUser({
			userRepository,
			id: targetId,
			email: "member-target@demote.test",
			role: "MEMBER",
		})

		const response = await request(fastifyServer.server)
			.patch(UserRoutes.DEMOTE_FROM_ADMIN)
			.set("Authorization", `Bearer ${token}`)
			.send({ userId: targetId })

		expect(response.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY)
		expect(response.body).toHaveProperty("message")
	})

	test("Deve retornar 422 ao tentar demover a si próprio", async () => {
		const response = await request(fastifyServer.server)
			.patch(UserRoutes.DEMOTE_FROM_ADMIN)
			.set("Authorization", `Bearer ${token}`)
			.send({ userId: adminId })

		expect(response.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY)
		expect(response.body).toHaveProperty("message")
	})
})
