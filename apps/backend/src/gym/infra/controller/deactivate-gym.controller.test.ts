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

describe("DeactivateGymController", () => {
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

	async function getAdminToken(): Promise<string> {
		await createAndSaveUser({
			userRepository,
			email: "admin@test.com",
			password: "any_password",
			role: RoleValues.ADMIN,
		})
		const result = await authenticate.execute({
			email: "admin@test.com",
			password: "any_password",
		})
		return result.force.success().value.token
	}

	async function getMemberToken(): Promise<string> {
		await createAndSaveUser({
			userRepository,
			email: "member@test.com",
			password: "any_password",
			role: RoleValues.MEMBER,
		})
		const result = await authenticate.execute({
			email: "member@test.com",
			password: "any_password",
		})
		return result.force.success().value.token
	}

	test("sem token, retorna 401", async () => {
		const gym = await createAndSaveGym({ gymRepository })

		const response = await request(fastifyServer.server).patch(
			GymRoutes.DEACTIVATE.replace(":gymId", gym.id),
		)

		expect(response.status).toBe(401)
	})

	test("admin desativa uma academia ativa e recebe 200", async () => {
		const token = await getAdminToken()
		const gym = await createAndSaveGym({ gymRepository })

		const response = await request(fastifyServer.server)
			.patch(GymRoutes.DEACTIVATE.replace(":gymId", gym.id))
			.set("Authorization", `Bearer ${token}`)

		expect(response.status).toBe(200)
		expect(response.body).toEqual({ message: "Gym deactivated" })
	})

	test("usuário não-admin recebe 403 ao tentar desativar uma academia", async () => {
		const token = await getMemberToken()
		const gym = await createAndSaveGym({ gymRepository })

		const response = await request(fastifyServer.server)
			.patch(GymRoutes.DEACTIVATE.replace(":gymId", gym.id))
			.set("Authorization", `Bearer ${token}`)

		expect(response.status).toBe(403)
	})

	test("desativar um gymId inexistente retorna 404", async () => {
		const token = await getAdminToken()

		const response = await request(fastifyServer.server)
			.patch(GymRoutes.DEACTIVATE.replace(":gymId", "non-existent-id"))
			.set("Authorization", `Bearer ${token}`)

		expect(response.status).toBe(404)
	})

	test("desativar uma academia já desativada retorna 409", async () => {
		const token = await getAdminToken()
		const gym = await createAndSaveGym({ gymRepository })
		gym.deactivate()
		await gymRepository.update(gym)

		const response = await request(fastifyServer.server)
			.patch(GymRoutes.DEACTIVATE.replace(":gymId", gym.id))
			.set("Authorization", `Bearer ${token}`)

		expect(response.status).toBe(409)
	})
})
