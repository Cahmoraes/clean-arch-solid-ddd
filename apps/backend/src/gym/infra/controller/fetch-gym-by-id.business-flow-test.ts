import request from "supertest"
import { createAndSaveGym } from "test/factory/create-and-save-gym"
import { serverBuildForTest } from "test/factory/server-build-for-test"

import { InMemoryGymRepository } from "@/shared/infra/database/repository/in-memory/in-memory-gym-repository"
import { container } from "@/shared/infra/ioc/container"
import { GYM_TYPES } from "@/shared/infra/ioc/types"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"

describe("Buscar Academia por ID", () => {
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

	test("Deve retornar 200 com os dados da academia quando encontrada", async () => {
		await createAndSaveGym({
			id: "gym-001",
			gymRepository,
			title: "Academia Força Total",
			description: "A melhor academia",
			phone: "11988880000",
			address: "Av. Principal, 100",
			latitude: -23.563099,
			longitude: -46.656571,
		})

		const response = await request(fastifyServer.server).get("/gyms/gym-001")

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body).toMatchObject({
			id: "gym-001",
			title: "Academia Força Total",
			description: "A melhor academia",
			phone: "11988880000",
			address: "Av. Principal, 100",
			latitude: -23.563099,
			longitude: -46.656571,
		})
	})

	test("Deve retornar 404 quando academia não existe", async () => {
		const response = await request(fastifyServer.server).get(
			"/gyms/id-inexistente",
		)

		expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
	})
})
