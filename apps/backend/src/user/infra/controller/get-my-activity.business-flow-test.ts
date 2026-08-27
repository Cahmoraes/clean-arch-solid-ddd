import request from "supertest"
import { createAndSaveUser } from "test/factory/create-and-save-user"
import { serverBuildForTest } from "test/factory/server-build-for-test"
import type { AuthenticateUseCase } from "@/session/application/use-case/authenticate.usecase"
import { InMemoryUserActivityDao } from "@/shared/infra/database/dao/in-memory/user-activity-dao-memory"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { AUTH_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"

describe("Buscar Meu Histórico de Atividade", () => {
	let fastifyServer: FastifyAdapter | undefined
	let userRepository: InMemoryUserRepository
	let authenticate: AuthenticateUseCase
	let memberToken: string

	beforeEach(async () => {
		container.snapshot()
		userRepository = new InMemoryUserRepository()
		container
			.rebind(USER_TYPES.Repositories.User)
			.toConstantValue(userRepository)
	})

	afterEach(async () => {
		container.restore()
		if (fastifyServer) await fastifyServer.close()
	})

	async function bootServerAndAuthenticateMember(): Promise<FastifyAdapter> {
		const server = await serverBuildForTest()
		fastifyServer = server
		await server.ready()
		authenticate = container.get<AuthenticateUseCase>(
			AUTH_TYPES.UseCases.Authenticate,
		)
		await createAndSaveUser({
			userRepository,
			id: "member-id",
			email: "member@activity.test",
			password: "any_password",
			role: "MEMBER",
		})
		const result = await authenticate.execute({
			email: "member@activity.test",
			password: "any_password",
		})
		memberToken = result.force.success().value.token
		return server
	}

	test("deve retornar a página solicitada com metadados de paginação", async () => {
		const activities = Array.from({ length: 21 }, (_, index) => ({
			id: `activity-${index + 1}`,
			type: "LOGIN" as const,
			description: `Login ${index + 1}`,
			occurredAt: new Date(
				`2025-01-${String(index + 10).padStart(2, "0")}T12:00:00.000Z`,
			),
		}))
		container
			.rebind(USER_TYPES.DAO.UserActivity)
			.toConstantValue(new InMemoryUserActivityDao(activities))
		const server = await bootServerAndAuthenticateMember()

		const response = await request(server.server)
			.get("/users/me/activity?page=2")
			.set("Authorization", `Bearer ${memberToken}`)

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body).toEqual({
			events: [
				{
					id: "activity-1",
					type: "LOGIN",
					description: "Login 1",
					occurredAt: activities[0].occurredAt.toISOString(),
				},
			],
			pagination: {
				page: 2,
				pageSize: 20,
				total: 21,
				totalPages: 2,
			},
		})
	})

	test("deve usar página 1 por padrão", async () => {
		const activities = Array.from({ length: 21 }, (_, index) => ({
			id: `activity-${index + 1}`,
			type: "LOGIN" as const,
			description: `Login ${index + 1}`,
			occurredAt: new Date(
				`2025-01-${String(index + 10).padStart(2, "0")}T12:00:00.000Z`,
			),
		}))
		container
			.rebind(USER_TYPES.DAO.UserActivity)
			.toConstantValue(new InMemoryUserActivityDao(activities))
		const server = await bootServerAndAuthenticateMember()

		const response = await request(server.server)
			.get("/users/me/activity")
			.set("Authorization", `Bearer ${memberToken}`)

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body.pagination).toEqual({
			page: 1,
			pageSize: 20,
			total: 21,
			totalPages: 2,
		})
		expect(response.body.events).toHaveLength(20)
		expect(response.body.events[0]).toEqual({
			id: "activity-21",
			type: "LOGIN",
			description: "Login 21",
			occurredAt: activities[20].occurredAt.toISOString(),
		})
		expect(response.body.events[19]).toEqual({
			id: "activity-2",
			type: "LOGIN",
			description: "Login 2",
			occurredAt: activities[1].occurredAt.toISOString(),
		})
	})

	test.each(["0", "1.5"])("deve rejeitar página inválida %s", async (page) => {
		container
			.rebind(USER_TYPES.DAO.UserActivity)
			.toConstantValue(new InMemoryUserActivityDao([]))
		const server = await bootServerAndAuthenticateMember()

		const response = await request(server.server)
			.get(`/users/me/activity?page=${page}`)
			.set("Authorization", `Bearer ${memberToken}`)

		expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
		expect(response.body).toEqual({
			message: expect.any(String),
		})
	})

	test("deve rejeitar página inteira fora do intervalo seguro", async () => {
		container
			.rebind(USER_TYPES.DAO.UserActivity)
			.toConstantValue(new InMemoryUserActivityDao([]))
		const server = await bootServerAndAuthenticateMember()

		const response = await request(server.server)
			.get("/users/me/activity?page=9007199254740992")
			.set("Authorization", `Bearer ${memberToken}`)

		expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
		expect(response.body).toEqual({
			message: expect.any(String),
		})
	})

	test("deve retornar 401 sem token", async () => {
		container
			.rebind(USER_TYPES.DAO.UserActivity)
			.toConstantValue(new InMemoryUserActivityDao([]))
		const server = await bootServerAndAuthenticateMember()

		const response = await request(server.server).get("/users/me/activity")

		expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
	})
})
