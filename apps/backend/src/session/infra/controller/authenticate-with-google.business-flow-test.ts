import { parseSetCookie } from "set-cookie-parser"
import request from "supertest"
import { createAndSaveUser } from "test/factory/create-and-save-user"
import { serverBuildForTest } from "test/factory/server-build-for-test"
import { InMemoryGoogleAuthProvider } from "@/session/infra/provider/in-memory-google-auth-provider.js"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { env } from "@/shared/infra/env"
import { container } from "@/shared/infra/ioc/container"
import { AUTH_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"

import { SessionRoutes } from "./routes/session-routes.js"

describe("Autenticar com Google", () => {
	let fastifyServer: FastifyAdapter
	let userRepository: InMemoryUserRepository
	let googleAuthProvider: InMemoryGoogleAuthProvider

	beforeEach(async () => {
		container.snapshot()
		const inMemoryUserRepository = new InMemoryUserRepository()
		container
			.rebind(USER_TYPES.Repositories.User)
			.toConstantValue(inMemoryUserRepository)
		userRepository = container.get<InMemoryUserRepository>(
			USER_TYPES.Repositories.User,
		)
		googleAuthProvider = new InMemoryGoogleAuthProvider()
		container
			.rebind(AUTH_TYPES.Providers.GoogleAuth)
			.toConstantValue(googleAuthProvider)
		fastifyServer = await serverBuildForTest()
		await fastifyServer.ready()
	})

	afterEach(async () => {
		container.restore()
		await fastifyServer.close()
	})

	test("Deve autenticar usuário existente com googleId", async () => {
		await createAndSaveUser({
			userRepository,
			email: "john@doe.com",
			googleId: "google-sub-123",
			name: "John Doe",
		})
		googleAuthProvider.addValidToken("valid-token", {
			sub: "google-sub-123",
			email: "john@doe.com",
			name: "John Doe",
			emailVerified: true,
		})

		const response = await request(fastifyServer.server)
			.post(SessionRoutes.AUTHENTICATE_GOOGLE)
			.send({ idToken: "valid-token" })

		const parsedCookie = parseSetCookie(response.headers["set-cookie"], {
			map: true,
		})

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body).toEqual({
			token: expect.any(String),
			refreshToken: expect.any(String),
		})
		expect(parsedCookie.refreshToken?.name).toBe(env.REFRESH_TOKEN_NAME)
		expect(parsedCookie.refreshToken?.httpOnly).toBe(true)
		expect(parsedCookie.refreshToken?.secure).toBe(true)
		expect(parsedCookie.refreshToken?.sameSite).toBe("Strict")
		expect(parsedCookie.refreshToken?.path).toBe("/")
	})

	test("Deve retornar 401 quando token Google for inválido", async () => {
		const response = await request(fastifyServer.server)
			.post(SessionRoutes.AUTHENTICATE_GOOGLE)
			.send({ idToken: "invalid-token" })

		expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
		expect(response.body).toEqual({ message: "Invalid Google token" })
	})

	test("Deve retornar 422 quando email Google não for verificado", async () => {
		googleAuthProvider.addValidToken("unverified-token", {
			sub: "google-sub-123",
			email: "john@doe.com",
			name: "John Doe",
			emailVerified: false,
		})

		const response = await request(fastifyServer.server)
			.post(SessionRoutes.AUTHENTICATE_GOOGLE)
			.send({ idToken: "unverified-token" })

		expect(response.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY)
		expect(response.body).toEqual({
			message: "Google email is not verified",
		})
	})

	test("Deve criar novo usuário e autenticar via Google", async () => {
		googleAuthProvider.addValidToken("new-user-token", {
			sub: "google-sub-new",
			email: "new@user.com",
			name: "New User",
			emailVerified: true,
		})

		const response = await request(fastifyServer.server)
			.post(SessionRoutes.AUTHENTICATE_GOOGLE)
			.send({ idToken: "new-user-token" })

		const createdUser = await userRepository.userOfEmail("new@user.com")

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body).toEqual({
			token: expect.any(String),
			refreshToken: expect.any(String),
		})
		expect(createdUser?.email).toBe("new@user.com")
		expect(createdUser?.name).toBe("New User")
		expect(createdUser?.googleId).toBe("google-sub-new")
	})

	test("Deve vincular conta Google a usuário existente pelo email e autenticar", async () => {
		await createAndSaveUser({
			userRepository,
			email: "john@doe.com",
			name: "John Doe",
			password: "any_password",
		})
		googleAuthProvider.addValidToken("link-token", {
			sub: "google-sub-123",
			email: "john@doe.com",
			name: "John Doe",
			emailVerified: true,
		})

		const response = await request(fastifyServer.server)
			.post(SessionRoutes.AUTHENTICATE_GOOGLE)
			.send({ idToken: "link-token" })

		const linkedUser = await userRepository.userOfGoogleId("google-sub-123")

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body).toEqual({
			token: expect.any(String),
			refreshToken: expect.any(String),
		})
		expect(linkedUser?.email).toBe("john@doe.com")
	})

	test("Deve retornar 409 quando email já estiver vinculado a outro googleId", async () => {
		await createAndSaveUser({
			userRepository,
			email: "john@doe.com",
			googleId: "existing-google-sub",
		})
		googleAuthProvider.addValidToken("conflict-token", {
			sub: "different-google-sub",
			email: "john@doe.com",
			name: "John Doe",
			emailVerified: true,
		})

		const response = await request(fastifyServer.server)
			.post(SessionRoutes.AUTHENTICATE_GOOGLE)
			.send({ idToken: "conflict-token" })

		expect(response.status).toBe(HTTP_STATUS.CONFLICT)
		expect(response.body).toMatchObject({
			message: expect.stringContaining("already linked"),
		})
	})
})
