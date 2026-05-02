import request from "supertest"
import { createAndSaveUser } from "test/factory/create-and-save-user"
import { serverBuildForTest } from "test/factory/server-build-for-test"
import { afterEach, beforeEach, describe, expect, test } from "vitest"
import { SessionRoutes } from "@/session/infra/controller/routes/session-routes"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { USER_TYPES } from "@/shared/infra/ioc/types"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"

describe("Session Contract Tests", () => {
	let fastifyServer: FastifyAdapter
	let userRepository: InMemoryUserRepository

	beforeEach(async () => {
		container.snapshot()
		userRepository = new InMemoryUserRepository()
		container
			.rebind(USER_TYPES.Repositories.User)
			.toConstantValue(userRepository)
		fastifyServer = await serverBuildForTest()
		await fastifyServer.ready()
	})

	afterEach(async () => {
		container.restore()
		await fastifyServer.close()
	})

	async function authenticateUser(
		email = "auth@test.com",
		password = "any_password",
	): Promise<string> {
		await createAndSaveUser({ userRepository, email, password })
		const response = await request(fastifyServer.server)
			.post(SessionRoutes.AUTHENTICATE)
			.send({ email, password })
		return response.body.token
	}

	describe("POST /sessions", () => {
		test("deve satisfazer a spec com status 200 ao autenticar", async () => {
			await createAndSaveUser({
				userRepository,
				email: "user@test.com",
				password: "any_password",
			})

			const response = await request(fastifyServer.server)
				.post(SessionRoutes.AUTHENTICATE)
				.send({ email: "user@test.com", password: "any_password" })

			expect(response.status).toBe(200)
			expect(response).toSatisfyApiSpec()
		})

		test("deve satisfazer a spec com status 401 para credenciais invalidas", async () => {
			const response = await request(fastifyServer.server)
				.post(SessionRoutes.AUTHENTICATE)
				.send({ email: "nobody@test.com", password: "wrong_password" })

			expect(response.status).toBe(401)
			expect(response).toSatisfyApiSpec()
		})
	})

	describe("PATCH /sessions/refresh", () => {
		test("deve satisfazer a spec com status 200 ao fazer refresh", async () => {
			await createAndSaveUser({
				userRepository,
				email: "refresh@test.com",
				password: "any_password",
			})

			const authResponse = await request(fastifyServer.server)
				.post(SessionRoutes.AUTHENTICATE)
				.send({ email: "refresh@test.com", password: "any_password" })

			const cookies = authResponse.headers["set-cookie"]

			const response = await request(fastifyServer.server)
				.patch(SessionRoutes.REFRESH)
				.set("Cookie", cookies)

			expect(response.status).toBe(200)
			expect(response).toSatisfyApiSpec()
		})

		test("deve satisfazer a spec com status 400 sem refresh token", async () => {
			const response = await request(fastifyServer.server).patch(
				SessionRoutes.REFRESH,
			)

			expect(response.status).toBe(400)
			expect(response).toSatisfyApiSpec()
		})
	})

	describe("POST /sessions/logout", () => {
		test("deve satisfazer a spec com status 204 ao fazer logout", async () => {
			const token = await authenticateUser("logout@test.com", "any_password")

			const response = await request(fastifyServer.server)
				.post(SessionRoutes.LOGOUT)
				.set("Authorization", `Bearer ${token}`)

			expect(response.status).toBe(204)
			expect(response).toSatisfyApiSpec()
		})

		test("deve satisfazer a spec com status 401 sem autenticacao", async () => {
			const response = await request(fastifyServer.server).post(
				SessionRoutes.LOGOUT,
			)

			expect(response.status).toBe(401)
			expect(response).toSatisfyApiSpec()
		})
	})
})
