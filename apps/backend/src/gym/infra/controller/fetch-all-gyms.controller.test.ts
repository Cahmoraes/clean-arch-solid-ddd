import request from "supertest"
import { createAndSaveGym } from "test/factory/create-and-save-gym"
import { createAndSaveUser } from "test/factory/create-and-save-user"
import { serverBuildForTest } from "test/factory/server-build-for-test"
import { afterEach, beforeEach, describe, expect, test } from "vitest"
import type { AuthenticateUseCase } from "@/session/application/use-case/authenticate.usecase"
import { InMemoryGymRepository } from "@/shared/infra/database/repository/in-memory/in-memory-gym-repository"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { AUTH_TYPES, GYM_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"
import { RoleValues } from "@/user/domain/value-object/role"
import { GymRoutes } from "./routes/gym-routes"

describe("FetchAllGymsController — includeInactive por papel", () => {
	let fastifyServer: FastifyAdapter
	let userRepository: InMemoryUserRepository
	let gymRepository: InMemoryGymRepository
	let authenticate: AuthenticateUseCase

	beforeEach(async () => {
		container.snapshot()
		userRepository = new InMemoryUserRepository()
		gymRepository = new InMemoryGymRepository()
		container
			.rebind(USER_TYPES.Repositories.User)
			.toConstantValue(userRepository)
		container.rebind(GYM_TYPES.Repositories.Gym).toConstantValue(gymRepository)
		authenticate = container.get<AuthenticateUseCase>(
			AUTH_TYPES.UseCases.Authenticate,
		)
		fastifyServer = await serverBuildForTest()
		await fastifyServer.ready()
	})

	afterEach(async () => {
		container.restore()
		await fastifyServer.close()
	})

	async function getTokenForRole(
		role: (typeof RoleValues)[keyof typeof RoleValues],
	): Promise<string> {
		const email = `${role.toLowerCase()}@test.com`
		await createAndSaveUser({
			userRepository,
			email,
			password: "any_password",
			role,
		})
		const result = await authenticate.execute({
			email,
			password: "any_password",
		})
		return result.force.success().value.token
	}

	test("sem token, retorna 401", async () => {
		const response = await request(fastifyServer.server).get(GymRoutes.LIST)

		expect(response.status).toBe(401)
	})

	test("admin autenticado vê academias desativadas na listagem, com status 'deactivated'", async () => {
		const token = await getTokenForRole(RoleValues.ADMIN)
		const gym = await createAndSaveGym({ gymRepository })
		gym.deactivate()
		await gymRepository.update(gym)

		const response = await request(fastifyServer.server)
			.get(GymRoutes.LIST)
			.set("Authorization", `Bearer ${token}`)

		expect(response.status).toBe(200)
		const found = response.body.gyms.find(
			(g: { id: string }) => g.id === gym.id,
		)
		expect(found?.status).toBe("deactivated")
	})

	test("usuário comum autenticado não vê academias desativadas na listagem", async () => {
		const token = await getTokenForRole(RoleValues.MEMBER)
		const gym = await createAndSaveGym({ gymRepository })
		gym.deactivate()
		await gymRepository.update(gym)

		const response = await request(fastifyServer.server)
			.get(GymRoutes.LIST)
			.set("Authorization", `Bearer ${token}`)

		expect(response.status).toBe(200)
		const found = response.body.gyms.find(
			(g: { id: string }) => g.id === gym.id,
		)
		expect(found).toBeUndefined()
	})
})
