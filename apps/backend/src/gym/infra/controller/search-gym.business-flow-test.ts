import request from "supertest"
import { createAndSaveGym } from "test/factory/create-and-save-gym"
import { createAndSaveUser } from "test/factory/create-and-save-user"
import { serverBuildForTest } from "test/factory/server-build-for-test"

import type { AuthenticateUseCase } from "@/session/application/use-case/authenticate.usecase"
import { InMemoryGymRepository } from "@/shared/infra/database/repository/in-memory/in-memory-gym-repository"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { AUTH_TYPES, GYM_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"
import { RoleValues } from "@/user/domain/value-object/role"

import { GymRoutes } from "./routes/gym-routes"
import type { SearchGymPayload } from "./search-gym.controller"

describe("Buscar Academia", () => {
	let fastifyServer: FastifyAdapter
	let gymRepository: InMemoryGymRepository
	let userRepository: InMemoryUserRepository
	let authenticate: AuthenticateUseCase
	let memberCounter = 0

	beforeEach(async () => {
		container.snapshot()
		gymRepository = new InMemoryGymRepository()
		userRepository = new InMemoryUserRepository()
		memberCounter = 0
		container.rebind(GYM_TYPES.Repositories.Gym).toConstantValue(gymRepository)
		container
			.rebind(USER_TYPES.Repositories.User)
			.toConstantValue(userRepository)
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

	async function getTokenForMember(): Promise<string> {
		memberCounter++
		const email = `member${memberCounter}@test.com`
		await createAndSaveUser({
			userRepository,
			email,
			password: "password",
			role: RoleValues.MEMBER,
		})
		const result = await authenticate.execute({
			email,
			password: "password",
		})
		return result.force.success().value.token
	}

	test("Deve buscar uma academia pelo nome", async () => {
		const token = await getTokenForMember()
		const input = {
			id: "1",
			title: "Academia Teste",
			description: "Academia Teste descrição",
			phone: "999999999",
			latitude: -23.563099,
			longitude: -46.656571,
		}
		const gym = await createAndSaveGym({
			gymRepository,
			...input,
		})

		const response = await request(fastifyServer.server)
			.get(toPath(input.title))
			.set("Authorization", `Bearer ${token}`)
			.send(input)

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body).toEqual({
			gyms: [
				{
					id: gym.id,
					title: gym.title,
					description: gym.description,
					phone: gym.phone,
					imageKey: gym.imageKey ?? null,
					latitude: gym.latitude,
					longitude: gym.longitude,
					status: "activated",
				},
			],
			pagination: { total: 1, page: 1, limit: 20 },
		})
	})

	test("Deve retornar 404 se a academia não for encontrada", async () => {
		const token = await getTokenForMember()
		const input: SearchGymPayload = {
			name: "Academia Inexistente",
		}

		const response = await request(fastifyServer.server)
			.get(toPath(input.name))
			.set("Authorization", `Bearer ${token}`)
			.send()

		expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
		expect(response.body).toEqual({
			message: "Gym not found",
		})
	})

	test("Deve retornar uma lista de academias", async () => {
		const token = await getTokenForMember()
		const input = {
			id: "1",
			title: "Academia Teste",
			description: "Academia Teste descrição",
			phone: "999999999",
			latitude: -23.563099,
			longitude: -46.656571,
		}
		for (let i = 0; i <= 22; i++) {
			await createAndSaveGym({
				id: `gym-${i}`,
				gymRepository,
				title: `Academia Teste ${i}`,
				description: "Academia Teste descrição",
				phone: "999999999",
				latitude: -23.563099,
				longitude: -46.656571,
			})
		}

		const response = await request(fastifyServer.server)
			.get(toPath(input.title))
			.set("Authorization", `Bearer ${token}`)
			.query({
				page: 2,
			})
			.send(input)

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body.gyms).toHaveLength(3)
		expect(response.body.pagination).toEqual({
			total: 23,
			page: 2,
			limit: 20,
		})
	})

	function toPath(path: string) {
		return GymRoutes.SEARCH.replace(":name", path)
	}
})
