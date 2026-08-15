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

	test("deve retornar 200 com o histórico do usuário autenticado", async () => {
		const occurredAt = new Date("2025-01-10T12:00:00.000Z")
		container.rebind(USER_TYPES.DAO.UserActivity).toConstantValue(
			new InMemoryUserActivityDao([
				{
					id: "activity-1",
					type: "LOGIN",
					description: "Login realizado",
					occurredAt,
				},
			]),
		)
		const server = await bootServerAndAuthenticateMember()

		const response = await request(server.server)
			.get("/users/me/activity")
			.set("Authorization", `Bearer ${memberToken}`)

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body.events).toEqual([
			{
				id: "activity-1",
				type: "LOGIN",
				description: "Login realizado",
				occurredAt: occurredAt.toISOString(),
			},
		])
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
