import { createHash, randomBytes } from "node:crypto"
import request from "supertest"
import { createAndSaveUser } from "test/factory/create-and-save-user"
import { serverBuildForTest } from "test/factory/server-build-for-test"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { SessionRoutes } from "@/session/infra/controller/routes/session-routes"
import type { CacheDB } from "@/shared/infra/database/redis/cache-db"
import { InMemoryPasswordResetTokenStore } from "@/shared/infra/database/repository/in-memory/in-memory-password-reset-token-store"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"
import { UserRoutes } from "./routes/user-routes"

const RESET_PASSWORD_ROUTE = "/password/reset"
const PASSWORD_RESET_TTL = 15 * 60

function makeTokenPair(): { rawToken: string; tokenHash: string } {
	const rawToken = randomBytes(32).toString("hex")
	const tokenHash = createHash("sha256").update(rawToken).digest("hex")
	return { rawToken, tokenHash }
}

describe("Redefinir senha", () => {
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

	test("Deve redefinir a senha com token válido", async () => {
		const user = await createAndSaveUser({
			userRepository,
			email: "john@test.com",
			password: "OldPass123!",
		})
		const { rawToken, tokenHash } = makeTokenPair()
		await tokenStore.saveResetToken(user.id, tokenHash, PASSWORD_RESET_TTL)
		await tokenStore.saveUidMapping(user.id, tokenHash, PASSWORD_RESET_TTL)

		const response = await request(fastifyServer.server)
			.post(RESET_PASSWORD_ROUTE)
			.send({
				token: rawToken,
				newPassword: "NewPass456!",
			})

		expect(response.status).toBe(HTTP_STATUS.NO_CONTENT)
		expect(response.body).toEqual({})
		const updatedUser = await userRepository.userOfId(user.id)
		expect(updatedUser).not.toBeNull()
		if (!updatedUser) {
			throw new Error("Updated user should exist")
		}
		await expect(updatedUser.checkPassword("NewPass456!")).resolves.toBe(true)
	})

	test("Deve retornar 400 quando o token for inválido ou expirado", async () => {
		const response = await request(fastifyServer.server)
			.post(RESET_PASSWORD_ROUTE)
			.send({
				token: "invalid-token",
				newPassword: "NewPass456!",
			})

		expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
		expect(response.body).toEqual({
			message: "Token inválido ou expirado.",
		})
	})

	test("Token de uso único: segundo uso retorna 400", async () => {
		const user = await createAndSaveUser({
			userRepository,
			email: "john@test.com",
			password: "OldPass123!",
		})
		const { rawToken, tokenHash } = makeTokenPair()
		await tokenStore.saveResetToken(user.id, tokenHash, PASSWORD_RESET_TTL)
		await tokenStore.saveUidMapping(user.id, tokenHash, PASSWORD_RESET_TTL)

		await request(fastifyServer.server)
			.post(RESET_PASSWORD_ROUTE)
			.send({ token: rawToken, newPassword: "NewPass456!" })

		const secondResponse = await request(fastifyServer.server)
			.post(RESET_PASSWORD_ROUTE)
			.send({ token: rawToken, newPassword: "AnotherPass789!" })

		expect(secondResponse.status).toBe(HTTP_STATUS.BAD_REQUEST)
	})

	test("Deve retornar 429 quando exceder rate limit da rota", async () => {
		for (let index = 0; index < 5; index++) {
			const response = await request(fastifyServer.server)
				.post(RESET_PASSWORD_ROUTE)
				.send({
					token: `invalid-token-${index}`,
					newPassword: "NewPass456!",
				})

			expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
		}

		const blockedResponse = await request(fastifyServer.server)
			.post(RESET_PASSWORD_ROUTE)
			.send({
				token: "invalid-token-blocked",
				newPassword: "NewPass456!",
			})

		expect(blockedResponse.status).toBe(HTTP_STATUS.TO_MANY_REQUESTS)
	})

	test("Deve encerrar sessões ativas após reset bem-sucedido", async () => {
		const user = await createAndSaveUser({
			userRepository,
			email: "john@test.com",
			password: "OldPass123!",
		})
		const { rawToken, tokenHash } = makeTokenPair()
		await tokenStore.saveResetToken(user.id, tokenHash, PASSWORD_RESET_TTL)
		await tokenStore.saveUidMapping(user.id, tokenHash, PASSWORD_RESET_TTL)

		try {
			vi.useFakeTimers({ toFake: ["Date"] })
			vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z"))

			const loginResponse = await request(fastifyServer.server)
				.post(SessionRoutes.AUTHENTICATE)
				.send({ email: user.email, password: "OldPass123!" })

			expect(loginResponse.status).toBe(HTTP_STATUS.OK)
			expect(loginResponse.body.token).toBeDefined()

			vi.setSystemTime(new Date("2024-01-01T00:00:01.000Z"))

			const resetResponse = await request(fastifyServer.server)
				.post(RESET_PASSWORD_ROUTE)
				.send({ token: rawToken, newPassword: "NewPass456!" })

			expect(resetResponse.status).toBe(HTTP_STATUS.NO_CONTENT)

			vi.setSystemTime(new Date("2024-01-01T00:00:02.000Z"))

			const revokedSessionResponse = await request(fastifyServer.server)
				.get(UserRoutes.ME)
				.set("Authorization", `Bearer ${loginResponse.body.token}`)

			expect(revokedSessionResponse.status).toBe(HTTP_STATUS.UNAUTHORIZED)
			expect(revokedSessionResponse.body).toEqual({
				message: "Session already revoked",
			})
		} finally {
			vi.useRealTimers()
		}
	})

	test("Token pós-login com nova senha acessa rotas protegidas após reset", async () => {
		const user = await createAndSaveUser({
			userRepository,
			email: "john@test.com",
			password: "OldPass123!",
		})
		const { rawToken, tokenHash } = makeTokenPair()
		await tokenStore.saveResetToken(user.id, tokenHash, PASSWORD_RESET_TTL)
		await tokenStore.saveUidMapping(user.id, tokenHash, PASSWORD_RESET_TTL)

		try {
			vi.useFakeTimers({ toFake: ["Date"] })
			vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z"))

			await request(fastifyServer.server)
				.post(RESET_PASSWORD_ROUTE)
				.send({ token: rawToken, newPassword: "NewPass456!" })

			vi.setSystemTime(new Date("2024-01-01T00:00:01.000Z"))

			const loginResponse = await request(fastifyServer.server)
				.post(SessionRoutes.AUTHENTICATE)
				.send({ email: user.email, password: "NewPass456!" })

			expect(loginResponse.status).toBe(HTTP_STATUS.OK)
			expect(loginResponse.body.token).toBeDefined()

			vi.setSystemTime(new Date("2024-01-01T00:00:02.000Z"))

			const protectedResponse = await request(fastifyServer.server)
				.get(UserRoutes.ME)
				.set("Authorization", `Bearer ${loginResponse.body.token}`)

			expect(protectedResponse.status).toBe(HTTP_STATUS.OK)
		} finally {
			vi.useRealTimers()
		}
	})

	test("Fluxo completo: login com nova senha funciona e com senha antiga falha", async () => {
		const user = await createAndSaveUser({
			userRepository,
			email: "john@test.com",
			password: "OldPass123!",
		})
		const { rawToken, tokenHash } = makeTokenPair()
		await tokenStore.saveResetToken(user.id, tokenHash, PASSWORD_RESET_TTL)
		await tokenStore.saveUidMapping(user.id, tokenHash, PASSWORD_RESET_TTL)

		await request(fastifyServer.server)
			.post(RESET_PASSWORD_ROUTE)
			.send({ token: rawToken, newPassword: "NewPass456!" })

		const loginWithNew = await request(fastifyServer.server)
			.post(SessionRoutes.AUTHENTICATE)
			.send({ email: user.email, password: "NewPass456!" })

		expect(loginWithNew.status).toBe(HTTP_STATUS.OK)
		expect(loginWithNew.body.token).toBeDefined()

		const loginWithOld = await request(fastifyServer.server)
			.post(SessionRoutes.AUTHENTICATE)
			.send({ email: user.email, password: "OldPass123!" })

		expect(loginWithOld.status).toBe(HTTP_STATUS.UNAUTHORIZED)
	})
})
