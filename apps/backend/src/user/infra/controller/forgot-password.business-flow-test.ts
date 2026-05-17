import request from "supertest"
import { createAndSaveUser } from "test/factory/create-and-save-user"
import { serverBuildForTest } from "test/factory/server-build-for-test"
import { afterEach, beforeEach, describe, expect, test } from "vitest"
import type { CacheDB } from "@/shared/infra/database/redis/cache-db"
import { InMemoryPasswordResetTokenStore } from "@/shared/infra/database/repository/in-memory/in-memory-password-reset-token-store"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"

const FORGOT_PASSWORD_ROUTE = "/password/forgot"
const GENERIC_SUCCESS_MESSAGE =
	"Se este e-mail estiver cadastrado, você receberá um link em breve."

describe("Esqueci minha senha", () => {
	let fastifyServer: FastifyAdapter
	let userRepository: InMemoryUserRepository
	let tokenStore: InMemoryPasswordResetTokenStore
	let cacheDB: CacheDB

	beforeEach(async () => {
		container.snapshot()
		userRepository = new InMemoryUserRepository()
		container
			.rebind(USER_TYPES.Repositories.User)
			.toConstantValue(userRepository)
		tokenStore = new InMemoryPasswordResetTokenStore()
		container
			.rebind(USER_TYPES.Gateways.PasswordResetTokenStore)
			.toConstantValue(tokenStore)
		cacheDB = container.get(SHARED_TYPES.Redis)
		await cacheDB.clear()
		fastifyServer = await serverBuildForTest()
		await fastifyServer.ready()
	})

	afterEach(async () => {
		await cacheDB.clear()
		container.restore()
		await fastifyServer.close()
	})

	test("Deve retornar mensagem genérica para e-mail inexistente", async () => {
		const response = await request(fastifyServer.server)
			.post(FORGOT_PASSWORD_ROUTE)
			.send({ email: "missing@test.com" })

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body).toEqual({
			message: GENERIC_SUCCESS_MESSAGE,
		})
	})

	test("Deve retornar mensagem genérica e gerar token para e-mail existente", async () => {
		const user = await createAndSaveUser({
			userRepository,
			email: "john@test.com",
			password: "OldPass123!",
		})

		const response = await request(fastifyServer.server)
			.post(FORGOT_PASSWORD_ROUTE)
			.send({ email: user.email })

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body).toEqual({
			message: GENERIC_SUCCESS_MESSAGE,
		})
		await expect(tokenStore.findTokenHashByUserId(user.id)).resolves.toEqual(
			expect.any(String),
		)
	})

	test("Deve retornar 429 quando exceder o rate limit da rota", async () => {
		for (let index = 0; index < 5; index++) {
			const response = await request(fastifyServer.server)
				.post(FORGOT_PASSWORD_ROUTE)
				.send({ email: `missing-${index}@test.com` })

			expect(response.status).toBe(HTTP_STATUS.OK)
		}

		const blockedResponse = await request(fastifyServer.server)
			.post(FORGOT_PASSWORD_ROUTE)
			.send({ email: "blocked@test.com" })

		expect(blockedResponse.status).toBe(HTTP_STATUS.TO_MANY_REQUESTS)
	})
})
