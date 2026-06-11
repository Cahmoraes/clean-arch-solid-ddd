import sharp from "sharp"
import request from "supertest"
import { createAndSaveGym } from "test/factory/create-and-save-gym"
import { createAndSaveUser } from "test/factory/create-and-save-user"

import { serverBuild } from "@/bootstrap/server-build"
import type { ImageStorage } from "@/gym/application/storage/image-storage"
import type { AuthenticateUseCase } from "@/session/application/use-case/authenticate.usecase"
import { InMemoryGymRepository } from "@/shared/infra/database/repository/in-memory/in-memory-gym-repository"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { AUTH_TYPES, GYM_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"
import { RoleValues } from "@/user/domain/value-object/role"

import { GymRoutes } from "./routes/gym-routes"

function makeFakeStorage() {
	const saved: string[] = []
	const storage: ImageStorage = {
		save: async () => {
			const key = "gyms/fake.webp"
			saved.push(key)
			return { key }
		},
		delete: async () => {},
	}
	return { storage, saved }
}

async function pngBuffer(): Promise<Buffer> {
	return sharp({
		create: {
			width: 600,
			height: 600,
			channels: 3,
			background: { r: 10, g: 20, b: 30 },
		},
	})
		.png()
		.toBuffer()
}

describe("Upload de imagem de Academia (POST /gyms/:gymId/image)", () => {
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
		await container.unbind(GYM_TYPES.Services.ImageStorage)
		container
			.bind(GYM_TYPES.Services.ImageStorage)
			.toConstantValue(makeFakeStorage().storage)
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

	async function adminToken(): Promise<string> {
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

	test("retorna 200 ao fazer upload de imagem PNG", async () => {
		const token = await adminToken()
		await createAndSaveGym({ gymRepository, id: "gym-1" })

		const response = await request(fastifyServer.server)
			.post(GymRoutes.UPLOAD_IMAGE.replace(":gymId", "gym-1"))
			.auth(token, { type: "bearer" })
			.attach("image", await pngBuffer(), {
				filename: "foto.png",
				contentType: "image/png",
			})

		expect(response.status).toBe(200)
		expect(response.body.imageKey).toBeDefined()
		expect(response.body.url).toBeDefined()
	})

	test("retorna 415 para content-type inválido", async () => {
		const token = await adminToken()
		await createAndSaveGym({ gymRepository, id: "gym-1" })

		const response = await request(fastifyServer.server)
			.post(GymRoutes.UPLOAD_IMAGE.replace(":gymId", "gym-1"))
			.auth(token, { type: "bearer" })
			.attach("image", Buffer.from("fake"), {
				filename: "foto.txt",
				contentType: "text/plain",
			})

		expect(response.status).toBe(415)
	})

	test("retorna 403 para usuário não-admin", async () => {
		await createAndSaveUser({
			userRepository,
			email: "member@email.com",
			password: "password",
			role: RoleValues.MEMBER,
		})
		const auth = await authenticate.execute({
			email: "member@email.com",
			password: "password",
		})
		const token = auth.forceSuccess().value.token
		await createAndSaveGym({ gymRepository, id: "gym-1" })

		const response = await request(fastifyServer.server)
			.post(GymRoutes.UPLOAD_IMAGE.replace(":gymId", "gym-1"))
			.auth(token, { type: "bearer" })
			.attach("image", await pngBuffer(), {
				filename: "foto.png",
				contentType: "image/png",
			})

		expect(response.status).toBe(403)
	})
})
