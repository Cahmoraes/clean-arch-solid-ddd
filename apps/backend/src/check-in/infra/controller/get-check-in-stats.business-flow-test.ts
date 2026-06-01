import request from "supertest"
import { createAndSaveCheckIn } from "test/factory/create-and-save-check-in"
import { createAndSaveUser } from "test/factory/create-and-save-user"
import { serverBuild } from "@/bootstrap/server-build"
import type { AuthenticateUseCase } from "@/session/application/use-case/authenticate.usecase"
import { InMemoryCheckInRepository } from "@/shared/infra/database/repository/in-memory/in-memory-check-in-repository"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { AUTH_TYPES, CHECKIN_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"
import { RoleValues } from "@/user/domain/value-object/role"
import { CheckInRoutes } from "./routes/check-in-routes"

describe("Stats de Check-Ins", () => {
	let fastifyServer: FastifyAdapter
	let checkInRepository: InMemoryCheckInRepository
	let userRepository: InMemoryUserRepository
	let authenticate: AuthenticateUseCase

	beforeEach(async () => {
		container.snapshot()
		checkInRepository = new InMemoryCheckInRepository()
		userRepository = new InMemoryUserRepository()
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

	describe("GET /check-ins/stats (admin)", () => {
		test("Deve retornar zeros quando não há check-ins", async () => {
			await createAndSaveUser({
				userRepository,
				email: "admin@test.com",
				password: "admin123",
				role: RoleValues.ADMIN,
			})
			const authResult = await authenticate.execute({
				email: "admin@test.com",
				password: "admin123",
			})
			const { token } = authResult.forceSuccess().value

			const response = await request(fastifyServer.server)
				.get(CheckInRoutes.STATS)
				.auth(token, { type: "bearer" })

			expect(response.status).toBe(200)
			expect(response.body.total).toBe(0)
			expect(response.body.pending).toBe(0)
			expect(response.body.validated).toBe(0)
			expect(response.body.rejected).toBe(0)
		})

		test("Deve retornar contagem correta por status", async () => {
			const admin = await createAndSaveUser({
				userRepository,
				id: "admin-stats",
				email: "admin-stats@test.com",
				password: "admin123",
				role: RoleValues.ADMIN,
			})

			await createAndSaveCheckIn({
				checkInRepository,
				id: "ci-pending",
				userId: admin.id,
				gymId: "gym-1",
				userLatitude: 0,
				userLongitude: 0,
			})

			const toValidate = await createAndSaveCheckIn({
				checkInRepository,
				id: "ci-validated",
				userId: admin.id,
				gymId: "gym-2",
				userLatitude: 0,
				userLongitude: 0,
			})
			toValidate.validate()
			await checkInRepository.save(toValidate)

			const authResult = await authenticate.execute({
				email: "admin-stats@test.com",
				password: "admin123",
			})
			const { token } = authResult.forceSuccess().value

			const response = await request(fastifyServer.server)
				.get(CheckInRoutes.STATS)
				.auth(token, { type: "bearer" })

			expect(response.status).toBe(200)
			expect(response.body.total).toBe(2)
			expect(response.body.pending).toBe(1)
			expect(response.body.validated).toBe(1)
			expect(response.body.rejected).toBe(0)
		})

		test("Deve negar acesso a MEMBER com 403", async () => {
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
				.get(CheckInRoutes.STATS)
				.auth(token, { type: "bearer" })

			expect(response.status).toBe(403)
		})
	})

	describe("GET /check-ins/me/stats (member)", () => {
		test("Deve retornar apenas stats do usuário autenticado", async () => {
			const member = await createAndSaveUser({
				userRepository,
				id: "member-me",
				email: "member-me@test.com",
				password: "member123",
				role: RoleValues.MEMBER,
			})

			await createAndSaveCheckIn({
				checkInRepository,
				id: "ci-mine",
				userId: member.id,
				gymId: "gym-1",
				userLatitude: 0,
				userLongitude: 0,
			})

			await createAndSaveCheckIn({
				checkInRepository,
				id: "ci-other",
				userId: "other-user-id",
				gymId: "gym-2",
				userLatitude: 0,
				userLongitude: 0,
			})

			const authResult = await authenticate.execute({
				email: "member-me@test.com",
				password: "member123",
			})
			const { token } = authResult.forceSuccess().value

			const response = await request(fastifyServer.server)
				.get(CheckInRoutes.MY_STATS)
				.auth(token, { type: "bearer" })

			expect(response.status).toBe(200)
			expect(response.body.total).toBe(1)
			expect(response.body.pending).toBe(1)
			expect(response.body.validated).toBe(0)
			expect(response.body.rejected).toBe(0)
		})
	})
})
