import { randomUUID } from "node:crypto"
import request from "supertest"
import { createAndSaveUser } from "test/factory/create-and-save-user"
import { serverBuildForTest } from "test/factory/server-build-for-test"
import type { AuthenticateUseCase } from "@/session/application/use-case/authenticate.usecase"
import { UserDAOMemory } from "@/shared/infra/database/dao/in-memory/user-dao-memory"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { AUTH_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"
import { StatusTypes } from "@/user/domain/value-object/status"
import { UserRoutes } from "./routes/user-routes"

describe("GET /users/stats", () => {
	let fastifyServer: FastifyAdapter
	let userDAO: UserDAOMemory
	let userRepository: InMemoryUserRepository
	let authenticate: AuthenticateUseCase
	let adminToken: string
	let memberToken: string

	beforeEach(async () => {
		container.snapshot()
		const userDAOMemory = new UserDAOMemory()
		container.rebind(USER_TYPES.DAO.User).toConstantValue(userDAOMemory)
		userDAO = container.get(USER_TYPES.DAO.User)
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
			id: randomUUID(),
			email: "admin@test.com",
			password: "any_password",
			role: "ADMIN",
		})
		const adminResult = await authenticate.execute({
			email: "admin@test.com",
			password: "any_password",
		})
		adminToken = adminResult.force.success().value.token

		await createAndSaveUser({
			userRepository,
			id: randomUUID(),
			email: "member@test.com",
			password: "any_password",
		})
		const memberResult = await authenticate.execute({
			email: "member@test.com",
			password: "any_password",
		})
		memberToken = memberResult.force.success().value.token
	})

	afterEach(async () => {
		container.restore()
		await fastifyServer.close()
	})

	test("Deve retornar os contadores de usuários para admin autenticado", async () => {
		userDAO.createFakeUser({ role: "MEMBER", status: StatusTypes.ACTIVATED })
		userDAO.createFakeUser({ role: "MEMBER", status: StatusTypes.ACTIVATED })
		userDAO.createFakeUser({ role: "ADMIN", status: StatusTypes.SUSPENDED })

		const response = await request(fastifyServer.server)
			.get(UserRoutes.STATS)
			.set("Authorization", `Bearer ${adminToken}`)

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body).toEqual({
			total: 3,
			members: 2,
			admins: 1,
			active: 2,
			inactive: 1,
		})
	})

	test("Deve retornar 401 sem token", async () => {
		const response = await request(fastifyServer.server).get(UserRoutes.STATS)
		expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
	})

	test("Deve retornar 403 para usuário com role MEMBER", async () => {
		const response = await request(fastifyServer.server)
			.get(UserRoutes.STATS)
			.set("Authorization", `Bearer ${memberToken}`)
		expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
	})
})
