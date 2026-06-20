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

describe("Atualizar Perfil de Usuário", () => {
	let fastifyServer: FastifyAdapter
	let userRepository: InMemoryUserRepository
	let authenticate: AuthenticateUseCase
	let adminToken: string
	const targetMemberId = "profile-target-member-id"

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

		// Requester: admin comum (não root)
		await createAndSaveUser({
			userRepository,
			id: randomUUID(),
			name: "admin user",
			email: "admin@profile.test",
			password: "any_password",
			role: "ADMIN",
		})

		// Alvo: membro
		await createAndSaveUser({
			userRepository,
			id: targetMemberId,
			name: "old_name",
			email: "old@profile.test",
			password: "any_password",
			role: "MEMBER",
		})

		const result = await authenticate.execute({
			email: "admin@profile.test",
			password: "any_password",
		})
		adminToken = result.force.success().value.token
	})

	afterEach(async () => {
		container.restore()
		await fastifyServer.close()
	})

	function profileUrl(id: string): string {
		return UserRoutes.PROFILE.replace(":userId", id)
	}

	test("Admin deve atualizar nome e email de um membro e responder 201", async () => {
		const response = await request(fastifyServer.server)
			.patch(profileUrl(targetMemberId))
			.set("Authorization", `Bearer ${adminToken}`)
			.send({
				name: "new valid name",
				email: "new@profile.test",
			})

		expect(response.status).toBe(HTTP_STATUS.CREATED)
		expect(response.body).toEqual({
			message: "User created",
			email: "new@profile.test",
		})
		const updated = await userRepository.userOfId(targetMemberId)
		expect(updated?.name).toBe("new valid name")
		expect(updated?.email).toBe("new@profile.test")
	})

	test("Deve retornar 401 quando o JWT não é fornecido", async () => {
		const response = await request(fastifyServer.server)
			.patch(profileUrl(targetMemberId))
			.send({ name: "new valid name", email: "new@profile.test" })

		expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
	})

	test("Deve retornar 400 quando o email é inválido", async () => {
		const response = await request(fastifyServer.server)
			.patch(profileUrl(targetMemberId))
			.set("Authorization", `Bearer ${adminToken}`)
			.send({ name: "new valid name", email: "invalid-email" })

		expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
		expect(response.body).toHaveProperty("message")
	})

	test("Deve retornar 404 quando o usuário alvo não existe (FR-012)", async () => {
		const response = await request(fastifyServer.server)
			.patch(profileUrl("non-existing-user-id"))
			.set("Authorization", `Bearer ${adminToken}`)
			.send({ name: "new valid name", email: "ghost@profile.test" })

		expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
		expect(response.body).toHaveProperty("message")
	})

	test("Admin comum recebe 403 ao tentar editar outro admin (FR-012)", async () => {
		const targetAdminId = randomUUID()
		await createAndSaveUser({
			userRepository,
			id: targetAdminId,
			email: "target-admin@profile.test",
			password: "any_password",
			role: "ADMIN",
		})

		const response = await request(fastifyServer.server)
			.patch(profileUrl(targetAdminId))
			.set("Authorization", `Bearer ${adminToken}`)
			.send({ name: "Hacked Name", email: "hacked@profile.test" })

		expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
		expect(response.body).toHaveProperty("message")
	})

	test("Regressão FR-011: PATCH /users/me (self-edit de nome) continua funcionando", async () => {
		// O endpoint /users/me usa UpdateMyProfileUseCase separado, sem política de autorização
		const response = await request(fastifyServer.server)
			.patch(UserRoutes.ME)
			.set("Authorization", `Bearer ${adminToken}`)
			.send({ name: "meu novo nome" })

		expect(response.status).toBe(HTTP_STATUS.OK)
	})
})
