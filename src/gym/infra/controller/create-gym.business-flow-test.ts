import request from "supertest"
import { createAndSaveUser } from "test/factory/create-and-save-user"

import { serverBuild } from "@/bootstrap/server-build"
import type { AuthenticateUseCase } from "@/session/application/use-case/authenticate.usecase"
import { InMemoryGymRepository } from "@/shared/infra/database/repository/in-memory/in-memory-gym-repository"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { AUTH_TYPES, GYM_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"
import { RoleValues } from "@/user/domain/value-object/role"

import type { CreateGymPayload } from "./create-gym.controller"
import { GymRoutes } from "./routes/gym-routes"

describe("Cadastrar Academia", () => {
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

	test("Deve criar uma academia", async () => {
		const userInputDto = {
			email: "user@email.com",
			password: "password",
			role: RoleValues.ADMIN,
		}
		await createAndSaveUser({
			userRepository,
			...userInputDto,
		})
		const authenticateOrError = await authenticate.execute({
			email: userInputDto.email,
			password: userInputDto.password,
		})
		const { token } = authenticateOrError.forceSuccess().value
		const input: CreateGymPayload = {
			cnpj: "11.222.333/0001-81",
			title: "Academia Teste",
			description: "Academia de teste",
			phone: "123456789",
			latitude: 0,
			longitude: 0,
		}
		const response = await request(fastifyServer.server)
			.post(GymRoutes.CREATE)
			.auth(token, { type: "bearer" })
			.send(input)

		expect(response.body.message).toBe("Gym created")
		expect(response.body.id).toBeDefined()
	})
})
