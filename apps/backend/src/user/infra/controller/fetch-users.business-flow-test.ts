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

describe("Buscar Usuários", () => {
	let fastifyServer: FastifyAdapter
	let userDAO: UserDAOMemory
	let userRepository: InMemoryUserRepository
	let authenticate: AuthenticateUseCase
	let token: string
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
			email: "admin@user.com",
			password: "any_password",
			role: "ADMIN",
		})
		const adminResult = await authenticate.execute({
			email: "admin@user.com",
			password: "any_password",
		})
		token = adminResult.force.success().value.token

		await createAndSaveUser({
			userRepository,
			id: randomUUID(),
			email: "member@user.com",
			password: "any_password",
		})
		const memberResult = await authenticate.execute({
			email: "member@user.com",
			password: "any_password",
		})
		memberToken = memberResult.force.success().value.token
	})

	afterEach(async () => {
		container.restore()
		await fastifyServer.close()
	})

	test("Deve retornar os usuários da página 1 em JSON", async () => {
		const fakeId = "fake_id"
		userDAO.createFakeUser({
			name: "any_name",
			email: "any_email",
			id: fakeId,
			status: StatusTypes.SUSPENDED,
		})
		userDAO.bulkCreateFakeUsers(19)
		const response = await request(fastifyServer.server)
			.get(UserRoutes.FETCH)
			.query({
				limit: 10,
				page: 1,
			})
			.set("Accept", "application/json")
			.set("Authorization", `Bearer ${token}`)

		expect(response.body.users.length).toBe(10)
		expect(response.body.pagination).toEqual({
			limit: 10,
			page: 1,
			total: 20,
		})
		expect(response.body.users[0].id).toBe(fakeId)
		expect(response.body.users[0].status).toBe(StatusTypes.SUSPENDED)
		expect(response.status).toBe(200)
	})

	test("Deve retornar os usuários da página 2", async () => {
		const fakeId = "fake_id"
		userDAO.createFakeUser({
			name: "any_name",
			email: "any_email",
			id: fakeId,
		})
		userDAO.bulkCreateFakeUsers(19)
		const response = await request(fastifyServer.server)
			.get(UserRoutes.FETCH)
			.query({
				limit: 10,
				page: 2,
			})
			.set("Authorization", `Bearer ${token}`)

		expect(response.body.users.length).toBe(10)
		expect(response.body.pagination).toEqual({
			limit: 10,
			page: 2,
			total: 20,
		})
		expect(response.status).toBe(200)
		expect(response.body.users[0].id).not.toBe(fakeId)
	})

	test("Não deve permitir que MEMBER liste usuários", async () => {
		const response = await request(fastifyServer.server)
			.get(UserRoutes.FETCH)
			.query({ limit: 10, page: 1 })
			.set("Authorization", `Bearer ${memberToken}`)

		expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
	})

	test("Deve retornar os usuários da página 1 em CSV", async () => {
		const fakeId = "fake_id"
		userDAO.createFakeUser({
			name: "any_name",
			email: "any_email",
			id: fakeId,
		})
		userDAO.bulkCreateFakeUsers(19)
		const response = await request(fastifyServer.server)
			.get(UserRoutes.FETCH)
			.query({
				limit: 10,
				page: 1,
			})
			.set("Accept", "text/csv")
			.set("Authorization", `Bearer ${token}`)

		expect(response.text).toEqual(expect.stringContaining(fakeId))
		expect(response.status).toBe(HTTP_STATUS.OK)
	})

	test("Deve filtrar usuários por nome parcial via query param", async () => {
		userDAO.createFakeUser({
			id: "u-joao",
			name: "João Silva",
			email: "joao@example.com",
		})
		userDAO.createFakeUser({
			id: "u-maria",
			name: "Maria Santos",
			email: "maria@example.com",
		})
		const response = await request(fastifyServer.server)
			.get(UserRoutes.FETCH)
			.query({ page: 1, limit: 10, query: "João" })
			.set("Accept", "application/json")
			.set("Authorization", `Bearer ${token}`)

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body.users).toHaveLength(1)
		expect(response.body.users[0].id).toBe("u-joao")
		expect(response.body.pagination.total).toBe(1)
	})

	test("Deve filtrar usuários por email parcial via query param", async () => {
		userDAO.createFakeUser({
			id: "u-joao",
			name: "João Silva",
			email: "joao@example.com",
		})
		userDAO.createFakeUser({
			id: "u-maria",
			name: "Maria Santos",
			email: "maria@example.com",
		})
		const response = await request(fastifyServer.server)
			.get(UserRoutes.FETCH)
			.query({ page: 1, limit: 10, query: "maria@" })
			.set("Accept", "application/json")
			.set("Authorization", `Bearer ${token}`)

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body.users).toHaveLength(1)
		expect(response.body.users[0].id).toBe("u-maria")
		expect(response.body.pagination.total).toBe(1)
	})

	test("Deve retornar todos os usuários quando query está ausente", async () => {
		userDAO.bulkCreateFakeUsers(5)
		const response = await request(fastifyServer.server)
			.get(UserRoutes.FETCH)
			.query({ page: 1, limit: 10 })
			.set("Accept", "application/json")
			.set("Authorization", `Bearer ${token}`)

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body.users).toHaveLength(5)
		expect(response.body.pagination.total).toBe(5)
	})

	test("Deve retornar lista vazia quando query não encontra usuários", async () => {
		userDAO.createFakeUser({
			id: "u-joao",
			name: "João Silva",
			email: "joao@example.com",
		})
		const response = await request(fastifyServer.server)
			.get(UserRoutes.FETCH)
			.query({ page: 1, limit: 10, query: "xyz_sem_match" })
			.set("Accept", "application/json")
			.set("Authorization", `Bearer ${token}`)

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body.users).toHaveLength(0)
		expect(response.body.pagination.total).toBe(0)
	})
})
