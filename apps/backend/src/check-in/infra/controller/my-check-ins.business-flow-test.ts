import request from "supertest"
import { createAndSaveCheckIn } from "test/factory/create-and-save-check-in"
import { createAndSaveGym } from "test/factory/create-and-save-gym"
import { createAndSaveUser } from "test/factory/create-and-save-user"

import { serverBuild } from "@/bootstrap/server-build"
import type { AuthenticateUseCase } from "@/session/application/use-case/authenticate.usecase"
import { InMemoryCheckInRepository } from "@/shared/infra/database/repository/in-memory/in-memory-check-in-repository"
import { InMemoryGymRepository } from "@/shared/infra/database/repository/in-memory/in-memory-gym-repository"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import {
	AUTH_TYPES,
	CHECKIN_TYPES,
	GYM_TYPES,
	USER_TYPES,
} from "@/shared/infra/ioc/types"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"
import { RoleValues } from "@/user/domain/value-object/role"
import { CheckInRoutes } from "./routes/check-in-routes"

describe("Meu Histórico de Check-Ins (GET /check-ins/me)", () => {
	let fastifyServer: FastifyAdapter
	let checkInRepository: InMemoryCheckInRepository
	let gymRepository: InMemoryGymRepository
	let userRepository: InMemoryUserRepository
	let authenticate: AuthenticateUseCase

	beforeEach(async () => {
		container.snapshot()
		gymRepository = new InMemoryGymRepository()
		checkInRepository = new InMemoryCheckInRepository()
		userRepository = new InMemoryUserRepository()
		container.unbind(GYM_TYPES.Repositories.Gym)
		container.bind(GYM_TYPES.Repositories.Gym).toConstantValue(gymRepository)
		container.unbind(CHECKIN_TYPES.Repositories.CheckIn)
		container
			.bind(CHECKIN_TYPES.Repositories.CheckIn)
			.toConstantValue(checkInRepository)
		container.unbind(USER_TYPES.Repositories.User)
		container.bind(USER_TYPES.Repositories.User).toConstantValue(userRepository)
		authenticate = container.get<AuthenticateUseCase>(
			AUTH_TYPES.UseCases.Authenticate,
		)
		fastifyServer = await serverBuild()
		await fastifyServer.ready()
	})

	afterEach(async () => {
		container.restore()
		await fastifyServer.close()
	})

	test("Deve retornar apenas os check-ins do usuário autenticado", async () => {
		const user = await createAndSaveUser({
			userRepository,
			id: "user-1",
			email: "user@test.com",
			password: "user1234",
			role: RoleValues.MEMBER,
		})

		const otherUser = await createAndSaveUser({
			userRepository,
			id: "other-user",
			email: "other@test.com",
			password: "other1234",
			role: RoleValues.MEMBER,
		})

		await createAndSaveCheckIn({
			checkInRepository,
			id: "ci-mine",
			userId: user.id,
			gymId: "gym-1",
			userLatitude: -23.5,
			userLongitude: -46.6,
		})

		await createAndSaveCheckIn({
			checkInRepository,
			id: "ci-other",
			userId: otherUser.id,
			gymId: "gym-1",
			userLatitude: -23.5,
			userLongitude: -46.6,
		})

		const authResult = await authenticate.execute({
			email: "user@test.com",
			password: "user1234",
		})
		const { token } = authResult.forceSuccess().value

		const response = await request(fastifyServer.server)
			.get(CheckInRoutes.HISTORY)
			.auth(token, { type: "bearer" })
			.query({ page: 1 })

		expect(response.status).toBe(200)
		expect(response.body.items).toHaveLength(1)
		expect(response.body.items[0].id).toBe("ci-mine")
		expect(response.body.total).toBe(1)
		expect(response.body.page).toBe(1)
	})

	test("Deve filtrar por status", async () => {
		const user = await createAndSaveUser({
			userRepository,
			id: "user-status",
			email: "status@test.com",
			password: "status1234",
			role: RoleValues.MEMBER,
		})

		await createAndSaveCheckIn({
			checkInRepository,
			id: "ci-pending",
			userId: user.id,
			gymId: "gym-1",
			userLatitude: 0,
			userLongitude: 0,
		})

		const authResult = await authenticate.execute({
			email: "status@test.com",
			password: "status1234",
		})
		const { token } = authResult.forceSuccess().value

		const pendingResponse = await request(fastifyServer.server)
			.get(CheckInRoutes.HISTORY)
			.auth(token, { type: "bearer" })
			.query({ page: 1, status: "pending" })

		expect(pendingResponse.status).toBe(200)
		expect(pendingResponse.body.items).toHaveLength(1)

		const validatedResponse = await request(fastifyServer.server)
			.get(CheckInRoutes.HISTORY)
			.auth(token, { type: "bearer" })
			.query({ page: 1, status: "validated" })

		expect(validatedResponse.status).toBe(200)
		expect(validatedResponse.body.items).toHaveLength(0)
	})

	test("Deve retornar 401 sem token", async () => {
		const response = await request(fastifyServer.server)
			.get(CheckInRoutes.HISTORY)
			.query({ page: 1 })

		expect(response.status).toBe(401)
	})

	test("Deve ser acessível por usuário MEMBER (não apenas admin)", async () => {
		await createAndSaveUser({
			userRepository,
			email: "member@test.com",
			password: "member1234",
			role: RoleValues.MEMBER,
		})

		const authResult = await authenticate.execute({
			email: "member@test.com",
			password: "member1234",
		})
		const { token } = authResult.forceSuccess().value

		const response = await request(fastifyServer.server)
			.get(CheckInRoutes.HISTORY)
			.auth(token, { type: "bearer" })
			.query({ page: 1 })

		expect(response.status).toBe(200)
	})

	test("Deve retornar gymTitle preenchido quando a academia existe", async () => {
		const user = await createAndSaveUser({
			userRepository,
			id: "user-gym-title",
			email: "gymtitle@test.com",
			password: "gymtitle123",
			role: RoleValues.MEMBER,
		})

		await createAndSaveGym({
			gymRepository,
			id: "gym-titulo",
			title: "Academia das Flores",
		})

		await createAndSaveCheckIn({
			checkInRepository,
			id: "ci-gym-title",
			userId: user.id,
			gymId: "gym-titulo",
			userLatitude: 0,
			userLongitude: 0,
		})

		const authResult = await authenticate.execute({
			email: "gymtitle@test.com",
			password: "gymtitle123",
		})
		const { token } = authResult.forceSuccess().value

		const response = await request(fastifyServer.server)
			.get(CheckInRoutes.HISTORY)
			.auth(token, { type: "bearer" })
			.query({ page: 1 })

		expect(response.status).toBe(200)
		expect(response.body.items[0].gymTitle).toBe("Academia das Flores")
	})
})
