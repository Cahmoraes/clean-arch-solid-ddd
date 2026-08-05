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

describe("Desativação em massa de usuários", () => {
	let fastifyServer: FastifyAdapter
	let userRepository: InMemoryUserRepository
	let authenticate: AuthenticateUseCase
	let token: string

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
			id: randomUUID(),
			email: "auth@bulk-deactivate.test",
			password: "any_password",
			role: "ADMIN",
		})
		const result = await authenticate.execute({
			email: "auth@bulk-deactivate.test",
			password: "any_password",
		})
		token = result.force.success().value.token
	})

	afterEach(async () => {
		container.restore()
		await fastifyServer.close()
	})

	test("Deve desativar em massa uma seleção mista e responder 200 com updated/requested/skipped", async () => {
		const member1Id = randomUUID()
		const member2Id = randomUUID()
		const otherAdminId = randomUUID()
		await createAndSaveUser({
			userRepository,
			id: member1Id,
			email: "member1@bulk-deactivate.test",
			role: "MEMBER",
		})
		const member2 = await createAndSaveUser({
			userRepository,
			id: member2Id,
			email: "member2@bulk-deactivate.test",
			role: "MEMBER",
		})
		member2.suspend()
		await userRepository.update(member2)
		await createAndSaveUser({
			userRepository,
			id: otherAdminId,
			email: "other-admin@bulk-deactivate.test",
			role: "ADMIN",
		})

		const response = await request(fastifyServer.server)
			.patch(UserRoutes.BULK_DEACTIVATE_USERS)
			.set("Authorization", `Bearer ${token}`)
			.send({ userIds: [member1Id, member2Id, otherAdminId] })

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body).toEqual({ updated: 1, requested: 3, skipped: 2 })
		const updatedMember1 = await userRepository.userOfId(member1Id)
		expect(updatedMember1?.status).toBe("suspended")
	})

	test("Deve retornar 400 para array vazio", async () => {
		const response = await request(fastifyServer.server)
			.patch(UserRoutes.BULK_DEACTIVATE_USERS)
			.set("Authorization", `Bearer ${token}`)
			.send({ userIds: [] })

		expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
	})

	test("Deve retornar 400 para mais de 100 IDs", async () => {
		const tooManyIds = Array.from({ length: 101 }, () => randomUUID())

		const response = await request(fastifyServer.server)
			.patch(UserRoutes.BULK_DEACTIVATE_USERS)
			.set("Authorization", `Bearer ${token}`)
			.send({ userIds: tooManyIds })

		expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
	})

	test("Deve retornar 400 para UUID inválido na lista", async () => {
		const response = await request(fastifyServer.server)
			.patch(UserRoutes.BULK_DEACTIVATE_USERS)
			.set("Authorization", `Bearer ${token}`)
			.send({ userIds: ["not-a-uuid"] })

		expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
	})

	test("Deve retornar 401 quando o JWT não é fornecido", async () => {
		const response = await request(fastifyServer.server)
			.patch(UserRoutes.BULK_DEACTIVATE_USERS)
			.send({ userIds: [randomUUID()] })

		expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
	})

	test("Deve retornar 403 quando o requester não é admin (MEMBER)", async () => {
		await createAndSaveUser({
			userRepository,
			id: randomUUID(),
			email: "member@bulk-deactivate.test",
			password: "member_password",
			role: "MEMBER",
		})
		const memberResult = await authenticate.execute({
			email: "member@bulk-deactivate.test",
			password: "member_password",
		})
		const memberToken = memberResult.force.success().value.token

		const response = await request(fastifyServer.server)
			.patch(UserRoutes.BULK_DEACTIVATE_USERS)
			.set("Authorization", `Bearer ${memberToken}`)
			.send({ userIds: [randomUUID()] })

		expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
	})

	test("Deve retornar 403 (NotAllowedToManageUserError) quando o requester deixou de existir", async () => {
		const requesterFound = await userRepository.userOfEmail(
			"auth@bulk-deactivate.test",
		)
		requesterFound?.delete()
		if (requesterFound) await userRepository.update(requesterFound)

		const response = await request(fastifyServer.server)
			.patch(UserRoutes.BULK_DEACTIVATE_USERS)
			.set("Authorization", `Bearer ${token}`)
			.send({ userIds: [randomUUID()] })

		expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
		expect(response.body).toHaveProperty("message")
	})
})
