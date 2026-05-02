import request from "supertest"
import { createAndSaveCheckIn } from "test/factory/create-and-save-check-in"
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

describe("Listar Check-Ins (GET /check-ins)", () => {
	let fastifyServer: FastifyAdapter
	let checkInRepository: InMemoryCheckInRepository
	let userRepository: InMemoryUserRepository
	let authenticate: AuthenticateUseCase

	beforeEach(async () => {
		container.snapshot()
		const gymRepository = new InMemoryGymRepository()
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

	test("Deve listar check-ins para admin autenticado", async () => {
		const adminUser = await createAndSaveUser({
			userRepository,
			email: "admin@test.com",
			password: "admin123",
			role: RoleValues.ADMIN,
		})

		await createAndSaveCheckIn({
			checkInRepository,
			id: "ci-1",
			userId: adminUser.id!,
			gymId: "gym-1",
			userLatitude: -23.5,
			userLongitude: -46.6,
		})

		const authResult = await authenticate.execute({
			email: "admin@test.com",
			password: "admin123",
		})
		const { token } = authResult.forceSuccess().value

		const response = await request(fastifyServer.server)
			.get(CheckInRoutes.LIST)
			.auth(token, { type: "bearer" })
			.query({ page: 1 })

		expect(response.status).toBe(200)
		expect(response.body.items).toHaveLength(1)
		expect(response.body.total).toBe(1)
		expect(response.body.page).toBe(1)
		expect(response.body.items[0].id).toBeDefined()
	})

	test("Deve filtrar por status pending", async () => {
		await createAndSaveUser({
			userRepository,
			id: "admin-id",
			email: "admin@test.com",
			password: "admin123",
			role: RoleValues.ADMIN,
		})

		await createAndSaveCheckIn({
			checkInRepository,
			id: "ci-pending",
			userId: "admin-id",
			gymId: "gym-1",
			userLatitude: 0,
			userLongitude: 0,
		})

		const authResult = await authenticate.execute({
			email: "admin@test.com",
			password: "admin123",
		})
		const { token } = authResult.forceSuccess().value

		const response = await request(fastifyServer.server)
			.get(CheckInRoutes.LIST)
			.auth(token, { type: "bearer" })
			.query({ page: 1, status: "pending" })

		expect(response.status).toBe(200)
		expect(response.body.items).toHaveLength(1)
	})

	test("Deve negar acesso a MEMBER", async () => {
		await createAndSaveUser({
			userRepository,
			email: "member@test.com",
			password: "member123",
			role: RoleValues.MEMBER,
		})

		const authResult = await authenticate.execute({
			email: "member@test.com",
			password: "member123",
		})
		const { token } = authResult.forceSuccess().value

		const response = await request(fastifyServer.server)
			.get(CheckInRoutes.LIST)
			.auth(token, { type: "bearer" })
			.query({ page: 1 })

		expect(response.status).toBe(403)
	})

	test("Deve negar acesso sem token", async () => {
		const response = await request(fastifyServer.server)
			.get(CheckInRoutes.LIST)
			.query({ page: 1 })

		expect(response.status).toBe(401)
	})
})
