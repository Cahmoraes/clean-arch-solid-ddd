import { randomUUID } from "node:crypto"
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

describe("Listar Academias", () => {
	let fastifyServer: FastifyAdapter
	let gymRepository: InMemoryGymRepository
	let userRepository: InMemoryUserRepository
	let authenticate: AuthenticateUseCase
	let token: string

	beforeEach(async () => {
		container.snapshot()
		gymRepository = new InMemoryGymRepository()
		userRepository = new InMemoryUserRepository()
		container.rebind(GYM_TYPES.Repositories.Gym).toConstantValue(gymRepository)
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
			email: "test@gym-list.test",
			password: "any_password",
			role: RoleValues.MEMBER,
		})
		const result = await authenticate.execute({
			email: "test@gym-list.test",
			password: "any_password",
		})
		token = result.forceSuccess().value.token
	})

	afterEach(async () => {
		container.restore()
		await fastifyServer.close()
	})

	test("Deve retornar array vazio quando não há academias cadastradas", async () => {
		const response = await request(fastifyServer.server)
			.get(GymRoutes.LIST)
			.set("Authorization", `Bearer ${token}`)

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body).toEqual({
			gyms: [],
			pagination: { total: 0, page: 1, limit: 20 },
		})
	})

	test("Deve retornar lista de academias cadastradas", async () => {
		await createAndSaveGym({
			id: "gym-1",
			gymRepository,
			title: "Academia Teste 1",
			description: "Descrição 1",
			phone: "11999999999",
			latitude: -23.563099,
			longitude: -46.656571,
		})
		await createAndSaveGym({
			id: "gym-2",
			gymRepository,
			title: "Academia Teste 2",
			latitude: -23.563099,
			longitude: -46.656571,
		})

		const response = await request(fastifyServer.server)
			.get(GymRoutes.LIST)
			.set("Authorization", `Bearer ${token}`)

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body.gyms).toHaveLength(2)
		expect(response.body.gyms[0]).toMatchObject({ title: "Academia Teste 1" })
		expect(response.body.pagination).toEqual({
			total: 2,
			page: 1,
			limit: 20,
		})
	})

	test("Deve paginar os resultados corretamente", async () => {
		for (let i = 1; i <= 23; i++) {
			await createAndSaveGym({
				id: `gym-${i}`,
				gymRepository,
				title: `Academia ${i}`,
				latitude: -23.563099,
				longitude: -46.656571,
			})
		}

		const page1 = await request(fastifyServer.server)
			.get(GymRoutes.LIST)
			.set("Authorization", `Bearer ${token}`)
			.query({ page: 1 })

		expect(page1.status).toBe(HTTP_STATUS.OK)
		expect(page1.body.gyms).toHaveLength(20)
		expect(page1.body.pagination).toEqual({
			total: 23,
			page: 1,
			limit: 20,
		})

		const page2 = await request(fastifyServer.server)
			.get(GymRoutes.LIST)
			.set("Authorization", `Bearer ${token}`)
			.query({ page: 2 })

		expect(page2.status).toBe(HTTP_STATUS.OK)
		expect(page2.body.gyms).toHaveLength(3)
		expect(page2.body.pagination).toEqual({
			total: 23,
			page: 2,
			limit: 20,
		})
	})
})
