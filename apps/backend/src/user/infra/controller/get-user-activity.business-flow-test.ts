import { randomUUID } from "node:crypto"
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

describe("Buscar Histórico de Atividade do Usuário", () => {
	let fastifyServer: FastifyAdapter | undefined
	let userRepository: InMemoryUserRepository
	let authenticate: AuthenticateUseCase
	let adminToken: string

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

	// Sobe o servidor e autentica o admin DEPOIS de qualquer rebind necessário
	// para o teste (ex: DAO.UserActivity) — o container Inversify instancia a
	// cadeia controller→use case→DAO no momento em que serverBuildForTest()
	// resolve os controllers, então um rebind feito DEPOIS desse ponto não
	// alcança a instância já montada. Chamar isto por último em cada teste.
	async function bootServerAndAuthenticateAdmin(): Promise<FastifyAdapter> {
		const server = await serverBuildForTest()
		fastifyServer = server
		await server.ready()
		authenticate = container.get<AuthenticateUseCase>(
			AUTH_TYPES.UseCases.Authenticate,
		)
		await createAndSaveUser({
			userRepository,
			id: randomUUID(),
			email: "admin@activity.test",
			password: "any_password",
			role: "ADMIN",
			isSuperAdmin: true,
		})
		const result = await authenticate.execute({
			email: "admin@activity.test",
			password: "any_password",
		})
		adminToken = result.force.success().value.token
		return server
	}

	test("deve retornar 200 com a lista de eventos de atividade", async () => {
		const targetId = randomUUID()
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
		const server = await bootServerAndAuthenticateAdmin()
		await createAndSaveUser({
			userRepository,
			id: targetId,
			email: "target@activity.test",
		})

		const response = await request(server.server)
			.get(`/users/${targetId}/activity`)
			.set("Authorization", `Bearer ${adminToken}`)

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

	test("deve retornar 403 quando o solicitante não é admin", async () => {
		const server = await bootServerAndAuthenticateAdmin()
		const targetId = randomUUID()
		await createAndSaveUser({
			userRepository,
			id: targetId,
			email: "target2@activity.test",
		})
		await createAndSaveUser({
			userRepository,
			id: randomUUID(),
			email: "member@activity.test",
			password: "member_password",
			role: "MEMBER",
		})
		const memberResult = await authenticate.execute({
			email: "member@activity.test",
			password: "member_password",
		})
		const memberToken = memberResult.force.success().value.token

		const response = await request(server.server)
			.get(`/users/${targetId}/activity`)
			.set("Authorization", `Bearer ${memberToken}`)

		expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
	})

	test("deve retornar 404 quando o usuário alvo não existe", async () => {
		const server = await bootServerAndAuthenticateAdmin()

		const response = await request(server.server)
			.get(`/users/${randomUUID()}/activity`)
			.set("Authorization", `Bearer ${adminToken}`)

		expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
	})
})
