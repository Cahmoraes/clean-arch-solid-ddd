import request from "supertest"
import { createAndSaveGym } from "test/factory/create-and-save-gym"
import { createAndSaveUser } from "test/factory/create-and-save-user"
import { isValidDate } from "test/is-valid-date"

import { serverBuild } from "@/bootstrap/server-build"
import type { AuthenticateUseCase } from "@/session/application/use-case/authenticate.usecase"
import { InMemoryCheckInRepository } from "@/shared/infra/database/repository/in-memory/in-memory-check-in-repository"
import { InMemoryGymRepository } from "@/shared/infra/database/repository/in-memory/in-memory-gym-repository"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import {
	AUTH_TYPES,
	CHECKIN_TYPES,
	GYM_TYPES,
	USER_TYPES,
} from "@/shared/infra/ioc/types"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"
import { RoleValues } from "@/user/domain/value-object/role"

import { CheckInRoutes } from "./routes/check-in-routes"

describe("Realizar CheckIn", () => {
	let fastifyServer: FastifyAdapter
	let gymRepository: InMemoryGymRepository
	let checkInRepository: InMemoryCheckInRepository
	let userRepository: InMemoryUserRepository
	let authenticate: AuthenticateUseCase

	beforeEach(async () => {
		container.snapshot()
		gymRepository = new InMemoryGymRepository()
		checkInRepository = new InMemoryCheckInRepository()
		userRepository = new InMemoryUserRepository()
		await container.unbind(GYM_TYPES.Repositories.Gym)
		container.bind(GYM_TYPES.Repositories.Gym).toConstantValue(gymRepository)
		await container.unbind(CHECKIN_TYPES.Repositories.CheckIn)
		container
			.bind(CHECKIN_TYPES.Repositories.CheckIn)
			.toConstantValue(checkInRepository)
		await container.unbind(USER_TYPES.Repositories.User)
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

	test("Deve realizar um check-in", async () => {
		const createUserDto = {
			email: "john@doe.com",
			password: "securepassword123",
			role: RoleValues.ADMIN,
		}
		const user = await createAndSaveUser({ userRepository, ...createUserDto })
		const gym = await createAndSaveGym({
			gymRepository,
			title: "fake gym",
			description: "fake description",
			latitude: -27.0747279,
			longitude: -49.4889672,
			phone: "11971457899",
			id: "fake_id",
		})

		const authenticateOrError = await authenticate.execute({
			email: createUserDto.email,
			password: createUserDto.password,
		})

		const { token } = authenticateOrError.forceSuccess().value

		const response = await request(fastifyServer.server)
			.post(CheckInRoutes.CREATE)
			.auth(token, { type: "bearer" })
			.send({
				userId: user.id,
				gymId: gym.id,
				userLatitude: -27.0747279,
				userLongitude: -49.4889672,
			})

		expect(response.body.message).toBe("Check-in created")
		expect(response.body.id).toBeDefined()
		expect(isValidDate(response.body.date)).toBeTruthy()
	})
})
