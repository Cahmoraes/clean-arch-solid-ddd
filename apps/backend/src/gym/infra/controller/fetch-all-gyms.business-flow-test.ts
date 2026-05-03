import request from "supertest"
import { createAndSaveGym } from "test/factory/create-and-save-gym"
import { serverBuildForTest } from "test/factory/server-build-for-test"

import { InMemoryGymRepository } from "@/shared/infra/database/repository/in-memory/in-memory-gym-repository"
import { container } from "@/shared/infra/ioc/container"
import { GYM_TYPES } from "@/shared/infra/ioc/types"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"

import { GymRoutes } from "./routes/gym-routes"

describe("Listar Academias", () => {
	let fastifyServer: FastifyAdapter
	let gymRepository: InMemoryGymRepository

	beforeEach(async () => {
		container.snapshot()
		gymRepository = new InMemoryGymRepository()
		container.rebind(GYM_TYPES.Repositories.Gym).toConstantValue(gymRepository)
		fastifyServer = await serverBuildForTest()
		await fastifyServer.ready()
	})

	afterEach(async () => {
		container.restore()
		await fastifyServer.close()
	})

	test("Deve retornar array vazio quando não há academias cadastradas", async () => {
		const response = await request(fastifyServer.server).get(GymRoutes.LIST)

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body).toEqual([])
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

		const response = await request(fastifyServer.server).get(GymRoutes.LIST)

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body).toHaveLength(2)
		expect(response.body[0]).toMatchObject({ title: "Academia Teste 1" })
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
			.query({ page: 1 })

		expect(page1.status).toBe(HTTP_STATUS.OK)
		expect(page1.body).toHaveLength(20)

		const page2 = await request(fastifyServer.server)
			.get(GymRoutes.LIST)
			.query({ page: 2 })

		expect(page2.status).toBe(HTTP_STATUS.OK)
		expect(page2.body).toHaveLength(3)
	})
})
