import request from "supertest"
import { createAndSaveGym } from "test/factory/create-and-save-gym"
import { createAndSaveUser } from "test/factory/create-and-save-user"
import { serverBuildForTest } from "test/factory/server-build-for-test"

import { CheckInRoutes } from "@/check-in/infra/controller/routes/check-in-routes"
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
import { HTTP_STATUS } from "@/shared/infra/server/http-status"
import { RoleValues } from "@/user/domain/value-object/role"

import { GymRoutes } from "./routes/gym-routes"

describe("Fluxo completo: desativar academia bloqueia check-in, reativar libera novamente", () => {
	let fastifyServer: FastifyAdapter
	let gymRepository: InMemoryGymRepository
	let checkInRepository: InMemoryCheckInRepository
	let userRepository: InMemoryUserRepository
	let authenticate: AuthenticateUseCase

	const gymCoordinate = {
		latitude: -27.0747279,
		longitude: -49.4889672,
	}

	beforeEach(async () => {
		container.snapshot()
		gymRepository = new InMemoryGymRepository()
		checkInRepository = new InMemoryCheckInRepository()
		userRepository = new InMemoryUserRepository()
		container.rebind(GYM_TYPES.Repositories.Gym).toConstantValue(gymRepository)
		container
			.rebind(CHECKIN_TYPES.Repositories.CheckIn)
			.toConstantValue(checkInRepository)
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
		return result.forceSuccess().value.token
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
		return result.forceSuccess().value.token
	}

	test("desativar bloqueia check-in com o mesmo erro de academia inexistente, reativar libera o check-in novamente", async () => {
		const adminToken = await getAdminToken()
		const memberToken = await getMemberToken()
		const gym = await createAndSaveGym({
			gymRepository,
			id: "gym-001",
			latitude: gymCoordinate.latitude,
			longitude: gymCoordinate.longitude,
		})

		const deactivateResponse = await request(fastifyServer.server)
			.patch(GymRoutes.DEACTIVATE.replace(":gymId", gym.id))
			.set("Authorization", `Bearer ${adminToken}`)

		expect(deactivateResponse.status).toBe(HTTP_STATUS.OK)
		expect(deactivateResponse.body).toEqual({ message: "Gym deactivated" })

		const checkInOnDeactivatedGym = await request(fastifyServer.server)
			.post(CheckInRoutes.CREATE)
			.set("Authorization", `Bearer ${memberToken}`)
			.send({
				gymId: gym.id,
				userLatitude: gymCoordinate.latitude,
				userLongitude: gymCoordinate.longitude,
			})

		const checkInOnNonExistentGym = await request(fastifyServer.server)
			.post(CheckInRoutes.CREATE)
			.set("Authorization", `Bearer ${memberToken}`)
			.send({
				gymId: "non-existent-gym-id",
				userLatitude: gymCoordinate.latitude,
				userLongitude: gymCoordinate.longitude,
			})

		expect(checkInOnDeactivatedGym.status).toBe(HTTP_STATUS.NOT_FOUND)
		expect(checkInOnDeactivatedGym.body).toEqual({ message: "Gym not found" })
		expect(checkInOnDeactivatedGym.status).toBe(checkInOnNonExistentGym.status)
		expect(checkInOnDeactivatedGym.body).toEqual(checkInOnNonExistentGym.body)

		const activateResponse = await request(fastifyServer.server)
			.patch(GymRoutes.ACTIVATE.replace(":gymId", gym.id))
			.set("Authorization", `Bearer ${adminToken}`)

		expect(activateResponse.status).toBe(HTTP_STATUS.OK)
		expect(activateResponse.body).toEqual({ message: "Gym activated" })

		const checkInAfterReactivation = await request(fastifyServer.server)
			.post(CheckInRoutes.CREATE)
			.set("Authorization", `Bearer ${memberToken}`)
			.send({
				gymId: gym.id,
				userLatitude: gymCoordinate.latitude,
				userLongitude: gymCoordinate.longitude,
			})

		expect(checkInAfterReactivation.status).toBe(HTTP_STATUS.CREATED)
		expect(checkInAfterReactivation.body.message).toBe("Check-in created")
		expect(checkInAfterReactivation.body.id).toBeDefined()
	})
})
