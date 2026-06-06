import request from "supertest"
import { createAndSaveGym } from "test/factory/create-and-save-gym"
import { createAndSaveUser } from "test/factory/create-and-save-user"

import { serverBuild } from "@/bootstrap/server-build"
import type { AuthenticateUseCase } from "@/session/application/use-case/authenticate.usecase"
import { InMemoryGymRepository } from "@/shared/infra/database/repository/in-memory/in-memory-gym-repository"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { AUTH_TYPES, GYM_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"
import { RoleValues } from "@/user/domain/value-object/role"
import type { UpdateGymPayload } from "./update-gym.controller"

describe("Atualizar Academia", () => {
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
		fastifyServer = await serverBuild()
		await fastifyServer.ready()
	})

	afterEach(async () => {
		container.restore()
		await fastifyServer.close()
	})

	test("Deve atualizar uma academia com sucesso (admin)", async () => {
		const userInputDto = {
			email: "admin@email.com",
			password: "password",
			role: RoleValues.ADMIN,
		}
		await createAndSaveUser({ userRepository, ...userInputDto })
		await createAndSaveGym({ gymRepository, id: "gym-001" })
		const { token } = (
			await authenticate.execute({
				email: userInputDto.email,
				password: userInputDto.password,
			})
		).forceSuccess().value

		const input: UpdateGymPayload = {
			cnpj: "11.222.333/0001-81",
			title: "Academia Atualizada",
			latitude: 0,
			longitude: 0,
			address: "Rua B, 2",
		}
		const response = await request(fastifyServer.server)
			.put("/gyms/gym-001")
			.auth(token, { type: "bearer" })
			.send(input)

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body.message).toBe("Gym updated")
		expect(response.body.id).toBeDefined()
	})

	test("Deve retornar 404 quando academia não existe", async () => {
		const userInputDto = {
			email: "admin@email.com",
			password: "password",
			role: RoleValues.ADMIN,
		}
		await createAndSaveUser({ userRepository, ...userInputDto })
		const { token } = (
			await authenticate.execute({
				email: userInputDto.email,
				password: userInputDto.password,
			})
		).forceSuccess().value

		const response = await request(fastifyServer.server)
			.put("/gyms/non-existent-id")
			.auth(token, { type: "bearer" })
			.send({
				cnpj: "11.222.333/0001-81",
				title: "Nome",
				latitude: 0,
				longitude: 0,
				address: "Rua A, 1",
			})

		expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
	})

	test("Deve retornar 403 para usuário não-admin", async () => {
		const userInputDto = {
			email: "user@email.com",
			password: "password",
			role: RoleValues.MEMBER,
		}
		await createAndSaveUser({ userRepository, ...userInputDto })
		const { token } = (
			await authenticate.execute({
				email: userInputDto.email,
				password: userInputDto.password,
			})
		).forceSuccess().value

		const response = await request(fastifyServer.server)
			.put("/gyms/any-id")
			.auth(token, { type: "bearer" })
			.send({
				cnpj: "11.222.333/0001-81",
				title: "Nome",
				latitude: 0,
				longitude: 0,
				address: "Rua A, 1",
			})

		expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
	})
})
