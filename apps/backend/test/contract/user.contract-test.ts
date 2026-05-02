import request from "supertest"
import { createAndSaveUser } from "test/factory/create-and-save-user"
import { serverBuildForTest } from "test/factory/server-build-for-test"
import { afterEach, beforeEach, describe, expect, test } from "vitest"

import type { AuthenticateUseCase } from "@/session/application/use-case/authenticate.usecase"
import { InMemoryCheckInRepository } from "@/shared/infra/database/repository/in-memory/in-memory-check-in-repository"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { AUTH_TYPES, CHECKIN_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"
import { UserRoutes } from "@/user/infra/controller/routes/user-routes"

describe("User Contract Tests", () => {
	let fastifyServer: FastifyAdapter
	let userRepository: InMemoryUserRepository
	let checkInRepository: InMemoryCheckInRepository
	let authenticate: AuthenticateUseCase

	beforeEach(async () => {
		container.snapshot()
		userRepository = new InMemoryUserRepository()
		checkInRepository = new InMemoryCheckInRepository()
		container
			.rebind(USER_TYPES.Repositories.User)
			.toConstantValue(userRepository)
		container
			.rebind(CHECKIN_TYPES.Repositories.CheckIn)
			.toConstantValue(checkInRepository)
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

	async function getToken(
		email = "auth@test.com",
		password = "any_password",
		role: "ADMIN" | "MEMBER" = "MEMBER",
	): Promise<string> {
		await createAndSaveUser({ userRepository, email, password, role })
		const result = await authenticate.execute({ email, password })
		return result.force.success().value.token
	}

	describe("POST /users", () => {
		test("deve satisfazer a spec com status 201 ao criar usuario", async () => {
			const response = await request(fastifyServer.server)
				.post(UserRoutes.CREATE)
				.send({
					name: "Valid Username",
					email: "valid@email.com",
					password: "any_password",
				})

			expect(response.status).toBe(201)
			expect(response).toSatisfyApiSpec()
		})

		test("deve satisfazer a spec com status 400 para dados invalidos", async () => {
			const response = await request(fastifyServer.server)
				.post(UserRoutes.CREATE)
				.send({
					name: "Valid Username",
					email: "invalid_email",
					password: "any_password",
				})

			expect(response.status).toBe(400)
			expect(response).toSatisfyApiSpec()
		})

		test("deve satisfazer a spec com status 409 para usuario duplicado", async () => {
			await createAndSaveUser({
				userRepository,
				email: "dup@email.com",
			})

			const response = await request(fastifyServer.server)
				.post(UserRoutes.CREATE)
				.send({
					name: "Valid Username",
					email: "dup@email.com",
					password: "any_password",
				})

			expect(response.status).toBe(409)
			expect(response).toSatisfyApiSpec()
		})
	})

	describe("GET /users", () => {
		test("deve satisfazer a spec com status 200 ao listar usuarios", async () => {
			const token = await getToken("admin@test.com", "any_password", "ADMIN")

			const response = await request(fastifyServer.server)
				.get(UserRoutes.FETCH)
				.query({ limit: 10, page: 1 })
				.set("Authorization", `Bearer ${token}`)

			expect(response.status).toBe(200)
			expect(response).toSatisfyApiSpec()
		})

		test("deve satisfazer a spec com status 401 sem autenticacao", async () => {
			const response = await request(fastifyServer.server)
				.get(UserRoutes.FETCH)
				.query({ limit: 10, page: 1 })

			expect(response.status).toBe(401)
			expect(response).toSatisfyApiSpec()
		})
	})

	describe("GET /users/:userId", () => {
		test("deve satisfazer a spec com status 200 ao buscar perfil", async () => {
			const user = await createAndSaveUser({
				userRepository,
				id: "user-profile-id",
				email: "profile@test.com",
			})
			const token = await getToken("auth2@test.com", "any_password", "ADMIN")

			const response = await request(fastifyServer.server)
				.get(
					UserRoutes.PROFILE.replace(":userId", user.id ?? "user-profile-id"),
				)
				.set("Authorization", `Bearer ${token}`)

			expect(response.status).toBe(200)
			expect(response).toSatisfyApiSpec()
		})

		test("deve satisfazer a spec com status 401 sem autenticacao", async () => {
			const response = await request(fastifyServer.server).get(
				UserRoutes.PROFILE.replace(":userId", "any-id"),
			)

			expect(response.status).toBe(401)
			expect(response).toSatisfyApiSpec()
		})
	})

	describe("GET /users/me", () => {
		test("deve satisfazer a spec com status 200 ao buscar meu perfil", async () => {
			const token = await getToken("me@test.com", "any_password")

			const response = await request(fastifyServer.server)
				.get(UserRoutes.ME)
				.set("Authorization", `Bearer ${token}`)

			expect(response.status).toBe(200)
			expect(response).toSatisfyApiSpec()
		})

		test("deve satisfazer a spec com status 401 sem autenticacao", async () => {
			const response = await request(fastifyServer.server).get(UserRoutes.ME)

			expect(response.status).toBe(401)
			expect(response).toSatisfyApiSpec()
		})
	})

	describe("GET /users/me/metrics", () => {
		test("deve satisfazer a spec com status 200 ao buscar metricas", async () => {
			const token = await getToken("metrics@test.com", "any_password")

			const response = await request(fastifyServer.server)
				.get(UserRoutes.METRICS)
				.set("Authorization", `Bearer ${token}`)

			expect(response.status).toBe(200)
			expect(response).toSatisfyApiSpec()
		})

		test("deve satisfazer a spec com status 401 sem autenticacao", async () => {
			const response = await request(fastifyServer.server).get(
				UserRoutes.METRICS,
			)

			expect(response.status).toBe(401)
			expect(response).toSatisfyApiSpec()
		})
	})

	describe("PATCH /users/me/change-password", () => {
		test("deve satisfazer a spec com status 204 ao alterar senha", async () => {
			const token = await getToken("chpwd@test.com", "old_password")

			const response = await request(fastifyServer.server)
				.patch(UserRoutes.CHANGE_PASSWORD)
				.set("Authorization", `Bearer ${token}`)
				.send({ newRawPassword: "new_password123" })

			expect(response.status).toBe(204)
			expect(response).toSatisfyApiSpec()
		})

		test("deve satisfazer a spec com status 401 sem autenticacao", async () => {
			const response = await request(fastifyServer.server)
				.patch(UserRoutes.CHANGE_PASSWORD)
				.send({ newRawPassword: "new_password123" })

			expect(response.status).toBe(401)
			expect(response).toSatisfyApiSpec()
		})
	})

	describe("PATCH /users/activate", () => {
		test("deve satisfazer a spec com status 401 sem autenticacao", async () => {
			const response = await request(fastifyServer.server)
				.patch(UserRoutes.ACTIVATE_USER)
				.send({ userId: "any-id" })

			expect(response.status).toBe(401)
			expect(response).toSatisfyApiSpec()
		})
	})
})
