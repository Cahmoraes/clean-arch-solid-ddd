import request from "supertest"
import { createAndSaveGym } from "test/factory/create-and-save-gym"
import { createAndSaveUser } from "test/factory/create-and-save-user"
import { serverBuildForTest } from "test/factory/server-build-for-test"
import type { CreateGymPayload } from "@/gym/infra/controller/create-gym.controller"
import { GymRoutes } from "@/gym/infra/controller/routes/gym-routes"
import type { UpdateGymPayload } from "@/gym/infra/controller/update-gym.controller"
import type { AuthenticateUseCase } from "@/session/application/use-case/authenticate.usecase"
import { InMemoryGymRepository } from "@/shared/infra/database/repository/in-memory/in-memory-gym-repository"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { AUTH_TYPES, GYM_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"
import { RoleValues } from "@/user/domain/value-object/role"

describe("Spec Gym Dates - Business Flow", () => {
	let fastifyServer: FastifyAdapter
	let userRepository: InMemoryUserRepository
	let gymRepository: InMemoryGymRepository
	let authenticate: AuthenticateUseCase

	beforeEach(async () => {
		container.snapshot()
		gymRepository = new InMemoryGymRepository()
		userRepository = new InMemoryUserRepository()
		await container.unbind(USER_TYPES.Repositories.User)
		container.bind(USER_TYPES.Repositories.User).toConstantValue(userRepository)
		await container.unbind(GYM_TYPES.Repositories.Gym)
		container.bind(GYM_TYPES.Repositories.Gym).toConstantValue(gymRepository)
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

	async function createAdminToken(): Promise<string> {
		await createAndSaveUser({
			userRepository,
			email: "admin@email.com",
			password: "password",
			role: RoleValues.ADMIN,
		})
		const auth = await authenticate.execute({
			email: "admin@email.com",
			password: "password",
		})
		return auth.forceSuccess().value.token
	}

	test("POST /gyms deve rejeitar operatingHours sobreposto com 400", async () => {
		const token = await createAdminToken()
		const payload: CreateGymPayload = {
			cnpj: "11.222.333/0001-81",
			title: "Academia Teste",
			description: "Academia com horário inválido",
			phone: "11999999999",
			latitude: -23.55052,
			longitude: -46.633308,
			address: "Rua das Flores, 123, São Paulo - SP",
			operatingHours: [
				{
					weekday: 1,
					intervals: [
						{ open: "08:00", close: "12:00" },
						{ open: "11:00", close: "14:00" },
					],
				},
			],
		}

		const response = await request(fastifyServer.server)
			.post(GymRoutes.CREATE)
			.auth(token, { type: "bearer" })
			.send(payload)

		expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
		expect(response.body.message).toMatch(/intervalos sobrepostos/i)
		expect(gymRepository.gyms.size).toBe(0)
	})

	test("POST /gyms deve criar operatingHours válido e GET deve devolver o mesmo JSON", async () => {
		const token = await createAdminToken()
		const operatingHours = [
			{ weekday: 1, intervals: [{ open: "06:00", close: "22:00" }] },
			{ weekday: 6, intervals: [{ open: "08:00", close: "14:00" }] },
		]
		const payload: CreateGymPayload = {
			cnpj: "11.444.777/0001-61",
			title: "Academia Horário Bom",
			description: "Academia com horário válido",
			phone: "11988887777",
			latitude: -23.55052,
			longitude: -46.633308,
			address: "Rua das Flores, 321, São Paulo - SP",
			operatingHours,
		}

		const createResponse = await request(fastifyServer.server)
			.post(GymRoutes.CREATE)
			.auth(token, { type: "bearer" })
			.send(payload)

		expect(createResponse.status).toBe(HTTP_STATUS.CREATED)
		expect(createResponse.body.message).toBe("Gym created")
		const gymId = createResponse.body.id as string

		const getResponse = await request(fastifyServer.server)
			.get(GymRoutes.GET.replace(":gymId", gymId))
			.auth(token, { type: "bearer" })

		expect(getResponse.status).toBe(HTTP_STATUS.OK)
		expect(getResponse.body.operatingHours).toEqual(operatingHours)
	})

	test("PUT /gyms/:gymId deve rejeitar operatingHours sobreposto com 400", async () => {
		const token = await createAdminToken()
		await createAndSaveGym({
			gymRepository,
			id: "gym-update-invalid",
			title: "Academia Atualizável",
			latitude: -23.55052,
			longitude: -46.633308,
		})

		const payload: UpdateGymPayload = {
			cnpj: "11.222.333/0001-81",
			title: "Academia Atualizada",
			latitude: -23.55052,
			longitude: -46.633308,
			address: "Rua das Flores, 123, São Paulo - SP",
			operatingHours: [
				{
					weekday: 1,
					intervals: [
						{ open: "08:00", close: "12:00" },
						{ open: "11:30", close: "14:00" },
					],
				},
			],
		}

		const response = await request(fastifyServer.server)
			.put(GymRoutes.UPDATE.replace(":gymId", "gym-update-invalid"))
			.auth(token, { type: "bearer" })
			.send(payload)

		expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
		expect(response.body.message).toMatch(/intervalos sobrepostos/i)
	})

	test("PUT /gyms/:gymId deve substituir operatingHours válido integralmente", async () => {
		const token = await createAdminToken()
		await createAndSaveGym({
			gymRepository,
			id: "gym-update-valid",
			title: "Academia Atualizável",
			latitude: -23.55052,
			longitude: -46.633308,
		})
		const operatingHours = [
			{ weekday: 1, intervals: [{ open: "08:00", close: "12:00" }] },
			{ weekday: 2, intervals: [{ open: "14:00", close: "18:00" }] },
		]
		const payload: UpdateGymPayload = {
			cnpj: "11.222.333/0001-81",
			title: "Academia Atualizada",
			latitude: -23.55052,
			longitude: -46.633308,
			address: "Rua das Flores, 123, São Paulo - SP",
			operatingHours,
		}

		const response = await request(fastifyServer.server)
			.put(GymRoutes.UPDATE.replace(":gymId", "gym-update-valid"))
			.auth(token, { type: "bearer" })
			.send(payload)

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body.message).toBe("Gym updated")

		const getResponse = await request(fastifyServer.server)
			.get(GymRoutes.GET.replace(":gymId", "gym-update-valid"))
			.auth(token, { type: "bearer" })

		expect(getResponse.status).toBe(HTTP_STATUS.OK)
		expect(getResponse.body.operatingHours).toEqual(operatingHours)
	})
})
